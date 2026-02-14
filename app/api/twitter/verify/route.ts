import { type NextRequest, NextResponse } from "next/server"
import { extractTweetId } from "@/lib/twitter/verification"
import { fetchTweetSyndication, verifyTweetContent, verifyTweetAge } from "@/lib/twitter/syndication"
import { createClient } from "@/lib/supabase/server"
import { isValidTwitterUrl } from "@/lib/anti-abuse/validators"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"
import { distributeReferralRewards } from "@/lib/referrals/system"
import { checkAndAwardAchievements } from "@/lib/achievements/checker"

export async function POST(request: NextRequest) {
  try {
    // ✅ КРИТИЧНО: Берём userId из headers (установлен middleware)
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tweetUrl } = await request.json()

    // ✅ Валидация входных данных
    if (!tweetUrl) {
      return NextResponse.json(
        { success: false, error: "Tweet URL is required" },
        { status: 400 }
      )
    }

    if (!isValidTwitterUrl(tweetUrl)) {
      return NextResponse.json(
        { success: false, error: "Invalid Twitter/X URL format" },
        { status: 400 }
      )
    }

    // Extract Twitter username and check uniqueness
    const extractedTweetId = extractTweetId(tweetUrl)
    if (extractedTweetId) {
      try {
        const tweetData = await fetchTweetSyndication(extractedTweetId)
        if (tweetData?.user?.screen_name) {
          const supabase = await createClient()
          const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("twitter_username", tweetData.user.screen_name)
            .neq("id", userId)
            .maybeSingle()

          if (existingUser) {
            return NextResponse.json({ 
              success: false, 
              error: "This Twitter account is already linked to another user" 
            }, { status: 400 })
          }
        }
      } catch (err) {
        console.log("[Twitter Verify] Could not check username uniqueness:", err)
      }
    }

    // ✅ Rate limiting по userId
    const rateLimit = checkRateLimit(userId, "TWITTER_VERIFY")
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(rateLimit.resetIn / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetIn / 1000).toString(),
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        }
      )
    }

    console.log("[API] POST /api/twitter/verify", { userId })

    // Extract tweet ID
    const tweetId = extractTweetId(tweetUrl)
    if (!tweetId) {
      return NextResponse.json(
        { success: false, error: "Could not extract tweet ID from URL" },
        { status: 400 }
      )
    }

    const tweet = await fetchTweetSyndication(tweetId)

    if (!tweet) {
      return NextResponse.json(
        { success: false, error: "Could not fetch tweet. Make sure it exists and is public." },
        { status: 400 }
      )
    }

    let supabase
    try {
      supabase = await createClient()
    } catch (error) {
      console.error("[API] Supabase client error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Database not configured. Please set up Supabase environment variables.",
        },
        { status: 500 }
      )
    }

    // ✅ Получаем user по userId из auth
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, wallet_address, twitter_username, twitter_verified_at, total_points, available_points")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      console.error("[API] User not found:", userError)
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // Проверяем возраст твита (должен быть свежим)
    const ageCheck = verifyTweetAge(tweet.created_at)
    if (!ageCheck.valid) {
      return NextResponse.json(
        { success: false, error: ageCheck.error },
        { status: 400 }
      )
    }

    // Проверяем контент твита И автора
    const contentCheck = verifyTweetContent(
      tweet.text, 
      user.wallet_address,
      tweet.user.screen_name,
      user.twitter_username || undefined // Если уже есть привязанный Twitter, проверяем что это он
    )
    if (!contentCheck.valid) {
      return NextResponse.json(
        { success: false, error: contentCheck.error },
        { status: 400 }
      )
    }

    const username = tweet.user.screen_name.toLowerCase()

    // ✅ Проверяем, что этот твит еще не использовался для верификации
    const { data: existingVerification, error: tweetCheckError } = await supabase
      .from("users")
      .select("wallet_address")
      .eq("twitter_verification_tweet", tweetUrl)
      .maybeSingle()

    if (tweetCheckError) {
      console.error("[API] Error checking tweet reuse:", tweetCheckError)
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      )
    }

    if (existingVerification) {
      return NextResponse.json(
        { success: false, error: "This tweet has already been used for verification" },
        { status: 400 }
      )
    }

    // ✅ Check if Twitter already linked to another wallet
    const { data: existingTwitterUser, error: checkError } = await supabase
      .from("users")
      .select("wallet_address")
      .eq("twitter_username", username)
      .maybeSingle()

    if (checkError) {
      console.error("[API] Error checking existing Twitter user:", checkError)
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      )
    }

    if (existingTwitterUser && existingTwitterUser.wallet_address !== user.wallet_address) {
      return NextResponse.json(
        { success: false, error: "This Twitter account is already linked to another wallet" },
        { status: 400 }
      )
    }

    // ✅ Update user with Twitter info
    const { error: updateError } = await supabase
      .from("users")
      .update({
        twitter_username: username,
        twitter_verified_at: new Date().toISOString(),
        twitter_verification_tweet: tweetUrl,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[API] Error updating user:", updateError)
      return NextResponse.json(
        { success: false, error: "Failed to save verification" },
        { status: 500 }
      )
    }

    // ✅ Award bonus points for Twitter verification
    const bonusPoints = 150
    const { error: pointsUpdateError } = await supabase
      .from("users")
      .update({
        total_points: user.total_points + bonusPoints,
        available_points: user.available_points + bonusPoints,
      })
      .eq("id", user.id)

    if (pointsUpdateError) {
      console.error("[API] Error updating points:", pointsUpdateError)
      // Не откатываем, так как верификация уже сохранена
    }

    const { error: transactionError } = await supabase.from("points_transactions").insert({
      user_id: user.id,
      amount: bonusPoints,
      type: "twitter_verification",
      description: "Twitter account verified",
    })

    if (transactionError) {
      console.error("[API] Error recording transaction:", transactionError)
      // Не откатываем, так как основная операция уже выполнена
    }

    // ✅ Распределение реферальных наград
    try {
      await distributeReferralRewards(user.id, bonusPoints, "twitter_verification")
    } catch (error) {
      console.error("[API] Error distributing referral rewards:", error)
      // Не блокируем ответ
    }

    // ✅ Проверка достижений
    try {
      await checkAndAwardAchievements(user.id, "twitter_connect")
    } catch (error) {
      console.error("[API] Error checking achievements:", error)
    }

    return NextResponse.json({
      success: true,
      data: {
        username,
        displayName: tweet.user.name,
        tweetId,
        bonusPoints,
      },
    })
  } catch (error) {
    console.error("[API] Error in POST /api/twitter/verify:", error)
    const errorMessage = error instanceof Error ? error.message : "Verification failed. Please try again."
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}