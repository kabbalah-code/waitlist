import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { calculateLevel } from "@/lib/db/users"
import { fetchTweetSyndication } from "@/lib/twitter/syndication"
import { extractTweetId } from "@/lib/twitter/verification"
import { isValidEvmAddress, isValidTwitterUrl } from "@/lib/anti-abuse/validators"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"
import { distributeReferralRewards } from "@/lib/referrals/system"

// Helper function to map new task types to legacy task_type values
function getTaskTypeMapping(taskType: string): string {
  const mapping: Record<string, string> = {
    'twitter_follow': 'follow_twitter',
    'twitter_like': 'like_pinned',
    'twitter_retweet': 'retweet_pinned',
    'twitter_comment': 'comment_tweet',
    'telegram_channel': 'join_telegram',
    'telegram_chat': 'join_telegram_chat'
  }
  return mapping[taskType] || taskType
}

export async function POST(request: NextRequest) {
  try {
    // ✅ КРИТИЧНО: Получаем userId из headers (установлен middleware)
    let userId = request.headers.get("x-user-id")
    let walletAddress = request.headers.get("x-wallet-address")
    
    // ✅ FALLBACK: If middleware headers missing, try storage headers
    if (!userId || !walletAddress) {
      userId = request.headers.get("x-user-id-storage")
      walletAddress = request.headers.get("x-wallet-address")
      
      console.log("[API] Using fallback headers:", { 
        hasUserId: !!userId, 
        hasWallet: !!walletAddress 
      })
    }
    
    if (!userId || !walletAddress) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please authenticate first." },
        { status: 401 }
      )
    }

    const { taskId, taskType, tweetUrl } = await request.json()

    // ✅ Валидация входных данных
    if (!taskId || !tweetUrl) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    if (!isValidEvmAddress(walletAddress)) {
      return NextResponse.json({ success: false, error: "Invalid wallet address format" }, { status: 400 })
    }

    if (!isValidTwitterUrl(tweetUrl)) {
      return NextResponse.json({ success: false, error: "Invalid Twitter/X URL format" }, { status: 400 })
    }

    // ✅ Rate limiting
    const rateLimit = checkRateLimit(walletAddress, "API_GENERAL")
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
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        },
      )
    }

    console.log("[API] POST /api/tasks/verify", { 
      userId: userId?.slice(0, 8) + "...", 
      walletAddress: walletAddress?.slice(0, 10) + "...",
      taskId, 
      taskType 
    })

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
        { status: 500 },
      )
    }

    // ✅ Get user directly by userId from headers (more reliable)
    console.log("[API] Looking up user by ID:", userId)
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    console.log("[API] User lookup result:", { 
      found: !!user, 
      error: userError?.message,
      userId: user?.id?.slice(0, 8) + "..." || 'none'
    })

    if (userError || !user) {
      console.error("[API] User not found by ID:", userId, userError)
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Verify wallet address matches (security check)
    if (user.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      console.error("[API] Wallet address mismatch:", user.wallet_address, "vs", walletAddress)
      return NextResponse.json({ success: false, error: "Wallet address mismatch" }, { status: 401 })
    }

    // ✅ Get task from database
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, points, task_type, is_active")
      .eq("id", taskId)
      .single()

    if (taskError || !task) {
      console.error("[API] Task not found:", taskError)
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    if (!task.is_active) {
      return NextResponse.json({ success: false, error: "Task is not active" }, { status: 400 })
    }

    // ✅ Check if already completed
    const { data: existingTask, error: checkError } = await supabase
      .from("tasks_completion")
      .select("id")
      .eq("user_id", user.id)
      .eq("task_type", getTaskTypeMapping(task.task_type)) // Check by task_type since task_id might not exist
      .maybeSingle()

    if (checkError) {
      console.error("[API] Error checking existing task:", checkError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    if (existingTask) {
      return NextResponse.json({ success: false, error: "Task already completed" }, { status: 400 })
    }

    // ✅ Verify tweet via Syndication API (бесплатный парсинг)
    const tweetId = extractTweetId(tweetUrl)
    if (!tweetId) {
      return NextResponse.json({ success: false, error: "Could not extract tweet ID from URL" }, { status: 400 })
    }

    const tweet = await fetchTweetSyndication(tweetId)
    if (!tweet) {
      return NextResponse.json(
        { success: false, error: "Could not fetch tweet. Make sure it exists and is public." },
        { status: 400 },
      )
    }

    // ✅ Verify tweet age (must be recent - within 24 hours)
    const { verifyTweetAge, verifyTweetContent } = await import("@/lib/twitter/syndication")
    const ageCheck = verifyTweetAge(tweet.created_at)
    if (!ageCheck.valid) {
      return NextResponse.json(
        { success: false, error: ageCheck.error || "Tweet is too old. Must be posted within last 24 hours." },
        { status: 400 },
      )
    }

    // ✅ Verify tweet content
    const contentCheck = verifyTweetContent(tweet.text, walletAddress)
    if (!contentCheck.valid) {
      return NextResponse.json(
        { success: false, error: contentCheck.error || "Tweet content validation failed" },
        { status: 400 },
      )
    }

    // ✅ Check if this tweet was already used
    const { data: usedTweet, error: usedError } = await supabase
      .from("tasks_completion")
      .select("id")
      .eq("task_data->>tweetUrl", tweetUrl)
      .maybeSingle()

    if (usedError) {
      console.error("[API] Error checking used tweet:", usedError)
    }

    if (usedTweet) {
      return NextResponse.json({ success: false, error: "This tweet was already used for verification" }, { status: 400 })
    }

    // ✅ Award points
    const points = task.points
    const newTotal = user.total_points + points
    const newAvailable = user.available_points + points
    const newLevel = calculateLevel(newTotal)

    // ✅ Update user с обработкой ошибок
    const { error: updateError } = await supabase
      .from("users")
      .update({
        total_points: newTotal,
        available_points: newAvailable,
        level: newLevel,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[API] Error updating user:", updateError)
      return NextResponse.json({ success: false, error: "Failed to update user points" }, { status: 500 })
    }

    // ✅ Record task completion
    const completionData: any = {
      user_id: user.id,
      task_type: getTaskTypeMapping(task.task_type), // Use legacy mapping for compatibility
      points_earned: points,
      task_data: { tweetUrl, tweetId, username: tweet.user.screen_name }
    }

    // Add task_id if the column exists (graceful handling)
    try {
      completionData.task_id = task.id
    } catch (e) {
      // Column might not exist, continue without it
    }

    const { error: completionError } = await supabase.from("tasks_completion").insert(completionData)

    if (completionError) {
      console.error("[API] Error recording task completion:", completionError)
      // Откатываем обновление очков
      await supabase
        .from("users")
        .update({
          total_points: user.total_points,
          available_points: user.available_points,
        })
        .eq("id", user.id)
      return NextResponse.json({ success: false, error: "Failed to record task completion" }, { status: 500 })
    }

    // ✅ Record points transaction
    const { error: transactionError } = await supabase.from("points_transactions").insert({
      user_id: user.id,
      amount: points,
      type: "task_completion",
      description: `Task: ${task.title}`,
      metadata: {
        task_id: task.id,
        task_type: taskType,
        tweet_url: tweetUrl,
      },
    })

    if (transactionError) {
      console.error("[API] Error recording transaction:", transactionError)
    }

    // ✅ Распределение реферальных наград
    if (points > 0) {
      try {
        await distributeReferralRewards(user.id, points, "task_completion")
      } catch (error) {
        console.error("[API] Error distributing referral rewards:", error)
      }
    }

    return NextResponse.json({
      success: true,
      points,
      newTotal,
      newAvailable,
      newLevel,
      username: tweet.user.screen_name,
    })
  } catch (error) {
    console.error("[API] Error in POST /api/tasks/verify:", error)
    const errorMessage = error instanceof Error ? error.message : "Verification failed"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
