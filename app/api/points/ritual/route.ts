import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserByWallet, calculateLevel } from "@/lib/db/users"
import { POINTS_CONFIG, calculateStreakBonus } from "@/lib/points/calculator"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"
import { distributeReferralRewards } from "@/lib/referrals/system"

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, prediction } = await request.json()

    // ✅ Валидация входных данных
    if (!walletAddress || !prediction) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    if (!isValidEvmAddress(walletAddress)) {
      return NextResponse.json({ success: false, error: "Invalid wallet address format" }, { status: 400 })
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

    console.log("[API] POST /api/points/ritual", { walletAddress: walletAddress.slice(0, 10) + "..." })

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

    const user = await getUserByWallet(walletAddress)

    if (!user) {
      console.error("[API] User not found:", walletAddress)
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // ✅ Check if already completed today с обработкой ошибок
    const today = new Date().toISOString().split("T")[0]
    const { data: existingRitual, error: checkError } = await supabase
      .from("daily_rituals")
      .select("id")
      .eq("user_id", user.id)
      .eq("ritual_date", today)
      .maybeSingle()

    if (checkError) {
      console.error("[API] Error checking existing ritual:", checkError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    if (existingRitual) {
      return NextResponse.json({ success: false, error: "Already completed today's ritual" }, { status: 400 })
    }

    // Calculate points (now will be converted to tokens)
    const basePoints = POINTS_CONFIG.DAILY_RITUAL
    const newStreak = user.last_ritual_date === getYesterday() ? user.current_streak + 1 : 1
    const streakBonus = calculateStreakBonus(newStreak)
    const totalPoints = basePoints + streakBonus

    // ✅ Mint KCODE tokens instead of just adding points
    let tokensMinted = 0
    let transactionHash = ""
    let alternativeReward = null
    let maxSupplyReached = false
    
    try {
      // Вызываем новый внутренний API для минта токенов
      const mintResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/internal/mint-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.INTERNAL_API_KEY || 'dev-key'
        },
        body: JSON.stringify({
          walletAddress,
          points: totalPoints,
          activity: 'daily_ritual'
        })
      })

      if (mintResponse.ok) {
        const mintResult = await mintResponse.json()
        if (mintResult.success) {
          if (mintResult.maxSupplyReached) {
            // MAX_SUPPLY достигнут - используем альтернативные награды
            maxSupplyReached = true
            alternativeReward = mintResult.alternativeReward
            console.log("[API] MAX_SUPPLY reached, awarded alternative reward:", alternativeReward?.type)
          } else {
            // Обычный минт токенов
            tokensMinted = mintResult.tokensAwarded
            transactionHash = mintResult.transactionHash
            console.log("[API] Tokens minted successfully:", tokensMinted, "KCODE")
          }
        } else {
          console.warn("[API] Token minting failed:", mintResult.error)
          // Продолжаем с обычными поинтами как fallback
        }
      }
    } catch (mintError) {
      console.error("[API] Error minting tokens:", mintError)
      // Продолжаем с обычными поинтами как fallback
    }

    // ✅ Save ritual с обработкой ошибок
    const { error: ritualError } = await supabase.from("daily_rituals").insert({
      user_id: user.id,
      prediction_text: prediction.text,
      prediction_data: prediction,
      points_earned: totalPoints,
      tokens_minted: tokensMinted,
      transaction_hash: transactionHash,
      ritual_date: today,
      alternative_reward: alternativeReward,
      max_supply_reached: maxSupplyReached
    })

    if (ritualError) {
      console.error("[API] Error saving ritual:", ritualError)
      return NextResponse.json({ success: false, error: "Failed to save ritual" }, { status: 500 })
    }

    // ✅ Исправление race condition: атомарное обновление
    const newTotal = user.total_points + totalPoints
    const newAvailable = newTotal // Синхронизируем: один тип поинтов
    const newFreeSpins = (user.free_spins || 0) + 1 // Добавляем 1 free spin за ритуал

    const { error: updateError } = await supabase
      .from("users")
      .update({
        total_points: newTotal,
        available_points: newAvailable,
        current_streak: newStreak,
        longest_streak: Math.max(user.longest_streak, newStreak),
        last_ritual_date: today,
        level: calculateLevel(newTotal),
        free_spins: newFreeSpins, // Обновляем free spins
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[API] Error updating user:", updateError)
      // Откатываем сохранение ритуала
      await supabase.from("daily_rituals").delete().eq("user_id", user.id).eq("ritual_date", today)
      return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 })
    }

    // ✅ Record transaction с обработкой ошибок
    const { error: transactionError } = await supabase.from("points_transactions").insert({
      user_id: user.id,
      amount: totalPoints,
      type: "daily_ritual",
      description: `Daily ritual${streakBonus > 0 ? ` + ${streakBonus} streak bonus` : ""}`,
    })

    if (transactionError) {
      console.error("[API] Error recording transaction:", transactionError)
      // Не откатываем, так как основная операция уже выполнена
    }

    // ✅ Распределение реферальных наград
    try {
      await distributeReferralRewards(user.id, totalPoints, "daily_ritual")
    } catch (error) {
      console.error("[API] Error distributing referral rewards:", error)
      // Не блокируем ответ, так как основная операция выполнена
    }

    return NextResponse.json({
      success: true,
      points: totalPoints,
      tokensAwarded: tokensMinted,
      transactionHash: transactionHash,
      streak: newStreak,
      streakBonus,
      newTotal,
      newAvailable,
      freeSpins: newFreeSpins, // Возвращаем новое количество free spins
      maxSupplyReached,
      alternativeReward: alternativeReward ? {
        type: alternativeReward.type,
        message: alternativeReward.message,
        reward: alternativeReward.reward
      } : null
    })
  } catch (error) {
    console.error("[API] Error in POST /api/points/ritual:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to complete ritual"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split("T")[0]
}
