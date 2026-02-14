import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserByWallet, calculateLevel } from "@/lib/db/users"
import { KCODE_REWARDS, calculateStreakBonus } from "@/lib/points/calculator"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"
import { rewardUserWithKcode } from "@/lib/web3/backend-contracts"

export async function POST(request: NextRequest) {
  try {
    const { tweetUrl, predictionMessage } = await request.json()

    // ✅ Get userId from headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    const walletAddress = request.headers.get("x-wallet-address")
    
    if (!userId || !walletAddress) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please authenticate first." },
        { status: 401 }
      )
    }

    // Validate input
    if (!tweetUrl || !predictionMessage) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 })
    }

    if (!tweetUrl.includes("twitter.com") && !tweetUrl.includes("x.com")) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid Twitter URL" 
      }, { status: 400 })
    }

    if (!isValidEvmAddress(walletAddress)) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid wallet address format" 
      }, { status: 400 })
    }

    // ✅ Rate limiting
    const rateLimit = checkRateLimit(walletAddress, "DAILY_RITUAL")
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
            "X-RateLimit-Limit": "3",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        },
      )
    }

    console.log("[API] POST /api/ritual/verify", { 
      userId: userId.slice(0, 10) + "...",
      walletAddress: walletAddress.slice(0, 10) + "...",
    })

    let supabase
    try {
      supabase = await createClient()
    } catch (error) {
      console.error("[API] Supabase client error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Database not configured.",
        },
        { status: 500 },
      )
    }

    const user = await getUserByWallet(walletAddress)

    if (!user) {
      console.error("[API] User not found:", walletAddress)
      return NextResponse.json({ 
        success: false, 
        error: "User not found" 
      }, { status: 404 })
    }

    // ✅ Check if already completed today
    const today = new Date().toISOString().split("T")[0]
    const { data: existingRitual, error: checkError } = await supabase
      .from("daily_rituals")
      .select("id")
      .eq("user_id", user.id)
      .eq("ritual_date", today)
      .maybeSingle()

    if (checkError) {
      console.error("[API] Error checking existing ritual:", checkError)
      return NextResponse.json({ 
        success: false, 
        error: "Database error" 
      }, { status: 500 })
    }

    if (existingRitual) {
      return NextResponse.json({ 
        success: false, 
        error: "Already completed today's ritual" 
      }, { status: 400 })
    }

    // ✅ Verify tweet via Syndication API
    const { extractTweetId } = await import("@/lib/twitter/verification")
    const { fetchTweetSyndication, verifyTweetAge } = await import("@/lib/twitter/syndication")
    
    const tweetId = extractTweetId(tweetUrl)
    if (!tweetId) {
      return NextResponse.json({ 
        success: false, 
        error: "Could not extract tweet ID from URL" 
      }, { status: 400 })
    }

    const tweet = await fetchTweetSyndication(tweetId)
    if (!tweet) {
      return NextResponse.json({ 
        success: false, 
        error: "Could not fetch tweet. Make sure it exists and is public." 
      }, { status: 400 })
    }

    // ✅ Verify tweet age (must be recent - within 24 hours)
    const ageCheck = verifyTweetAge(tweet.created_at)
    if (!ageCheck.valid) {
      return NextResponse.json({ 
        success: false, 
        error: ageCheck.error || "Tweet is too old. Must be posted within last 24 hours." 
      }, { status: 400 })
    }

    // ✅ Verify tweet content
    const { verifyRitualTweetContent } = await import("@/lib/twitter/syndication")
    const contentCheck = verifyRitualTweetContent(
      tweet.text, 
      predictionMessage, 
      tweet.user.screen_name,
      user.twitter_username || undefined
    )
    if (!contentCheck.valid) {
      return NextResponse.json({ 
        success: false, 
        error: contentCheck.error || "Tweet content validation failed" 
      }, { status: 400 })
    }

    // 🔒 ANTI-SYBIL CHECKS
    const { RitualAntiSybil } = await import("@/lib/anti-sybil/comprehensive-protection")
    const ritualAntiSybil = new RitualAntiSybil()
    
    const eligibilityCheck = await ritualAntiSybil.checkRitualEligibility(
      walletAddress,
      tweetUrl,
      tweet.user.screen_name,
      user.twitter_username || undefined
    )

    if (!eligibilityCheck.allowed) {
      console.log("[API] Ritual blocked by anti-sybil:", eligibilityCheck.reasons)
      return NextResponse.json({ 
        success: false, 
        error: eligibilityCheck.reasons[0] || "Ritual verification failed security checks"
      }, { status: 403 })
    }

    // Calculate KCODE rewards
    const baseKcode = KCODE_REWARDS.DAILY_RITUAL // 1 KCODE
    const newStreak = user.last_ritual_date === getYesterday() ? user.current_streak + 1 : 1
    const streakBonus = calculateStreakBonus(newStreak) // 0.5-2 KCODE
    const totalKcode = baseKcode + streakBonus
    const newFreeSpins = (user.free_spins || 0) + 1 // +1 free spin

    // ✅ REWARD USER WITH KCODE TOKENS ON-CHAIN!
    let txHash: string | undefined
    try {
      txHash = await rewardUserWithKcode(
        user.wallet_address,
        totalKcode,
        `Daily Ritual (Streak: ${newStreak})`
      )
      console.log(`[API] ✅ Rewarded ${totalKcode} KCODE for daily ritual. TX: ${txHash}`)
    } catch (contractError) {
      console.error("[API] Error rewarding KCODE on-chain:", contractError)
      return NextResponse.json(
        { success: false, error: "Failed to mint tokens on blockchain" },
        { status: 500 }
      )
    }

    // ✅ Save ritual
    const { error: ritualError } = await supabase.from("daily_rituals").insert({
      user_id: user.id,
      prediction_text: predictionMessage,
      prediction_data: { message: predictionMessage },
      kcode_earned: totalKcode,
      transaction_hash: txHash,
      ritual_date: today,
      tweet_url: tweetUrl,
    })

    if (ritualError) {
      console.error("[API] Error saving ritual:", ritualError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to save ritual" 
      }, { status: 500 })
    }

    // ✅ Update user
    const newTotal = user.total_kcode + totalKcode
    const newLevel = calculateLevel(newTotal)

    const { error: updateError } = await supabase
      .from("users")
      .update({
        total_kcode: newTotal,
        tokens_minted: user.tokens_minted + totalKcode,
        current_streak: newStreak,
        longest_streak: Math.max(user.longest_streak, newStreak),
        last_ritual_date: today,
        level: newLevel,
        free_spins: newFreeSpins,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[API] Error updating user:", updateError)
      // Don't rollback - tokens already minted on-chain
    }

    // ✅ Record transaction in kcode_transactions
    const { error: transactionError } = await supabase.from("kcode_transactions").insert({
      user_id: user.id,
      amount: totalKcode,
      type: "daily_ritual",
      description: `Daily Ritual (Streak: ${newStreak})`,
      tx_hash: txHash,
      metadata: {
        streak: newStreak,
        streak_bonus: streakBonus,
        tweet_url: tweetUrl,
      },
    })

    if (transactionError) {
      console.error("[API] Error recording transaction:", transactionError)
    }

    // ✅ Record in blockchain_transactions for TokenHistory component
    const { error: blockchainTxError } = await supabase.from("blockchain_transactions").insert({
      user_id: user.id,
      wallet_address: user.wallet_address,
      transaction_hash: txHash,
      transaction_type: 'reward',
      amount: totalKcode.toString(),
      status: 'confirmed',
      description: `Daily Ritual (Streak: ${newStreak})`,
      contract_address: process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS,
    })

    if (blockchainTxError) {
      console.error("[API] Error recording blockchain transaction:", blockchainTxError)
    } else {
      console.log("[API] ✅ Blockchain transaction recorded for TokenHistory")
    }

    // ✅ Referral rewards handled by smart contract automatically

    return NextResponse.json({
      success: true,
      data: {
        kcode: totalKcode,
        baseReward: baseKcode,
        streakBonus,
        newStreak,
        newTotal,
        newLevel,
        freeSpins: newFreeSpins,
        txHash,
      }
    })
  } catch (error) {
    console.error("[API] Error in POST /api/ritual/verify:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to verify ritual"
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 })
  }
}

function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split("T")[0]
}
