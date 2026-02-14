import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { calculateLevel } from "@/lib/db/users"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"
import { distributeReferralRewards } from "@/lib/referrals/system"
import { checkAndAwardAchievements } from "@/lib/achievements/checker"
import { z } from "zod"

// Zod schema для валидации
const unlockSephiraSchema = z.object({
  sephiraId: z.number().int().positive("Sephira ID must be positive"),
})

export async function POST(request: NextRequest) {
  try {
    // ✅ КРИТИЧНО: Получаем userId из headers (установлен middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please authenticate first." },
        { status: 401 }
      )
    }

    // Валидация входных данных
    const body = await request.json()
    const validationResult = unlockSephiraSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { sephiraId } = validationResult.data

    // ✅ Rate limiting по userId
    const rateLimit = checkRateLimit(userId, "API_GENERAL")
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
        }
      )
    }

    console.log("[API] POST /api/sephirot/unlock", { userId: userId.slice(0, 10) + "...", sephiraId })

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

    // ✅ Получаем user по userId из authenticated session
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      console.error("[API] User not found:", userId, userError)
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // ✅ Get sephira info
    const { data: sephira, error: sephiraError } = await supabase
      .from("sephirot")
      .select("*")
      .eq("id", sephiraId)
      .single()

    if (sephiraError || !sephira) {
      console.error("[API] Error fetching sephira:", sephiraError)
      return NextResponse.json({ success: false, error: "Sephira not found" }, { status: 404 })
    }

    // ✅ Check if already unlocked
    const { data: existing, error: checkError } = await supabase
      .from("user_sephirot")
      .select("id")
      .eq("user_id", user.id)
      .eq("sephira_id", sephiraId)
      .maybeSingle()

    if (checkError) {
      console.error("[API] Error checking existing unlock:", checkError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ success: false, error: "Sephira already unlocked" }, { status: 400 })
    }

    // ✅ Check level requirement
    if (user.level < sephira.required_level) {
      return NextResponse.json(
        {
          success: false,
          error: `Requires level ${sephira.required_level}. Current level: ${user.level}`,
        },
        { status: 400 }
      )
    }

    // ✅ Check if user has enough points
    if (user.available_points < sephira.unlock_cost) {
      return NextResponse.json(
        {
          success: false,
          error: `Not enough points. Required: ${sephira.unlock_cost}, Available: ${user.available_points}`,
        },
        { status: 400 }
      )
    }

    // ✅ Check if previous sephirot are unlocked (except Malkuth which is free)
    if (sephiraId > 1) {
      const { data: previousSephirot, error: prevError } = await supabase
        .from("sephirot")
        .select("id")
        .lt("id", sephiraId)
        .order("id", { ascending: true })

      if (!prevError && previousSephirot) {
        const { data: unlocked, error: unlockedError } = await supabase
          .from("user_sephirot")
          .select("sephira_id")
          .eq("user_id", user.id)
          .in(
            "sephira_id",
            previousSephirot.map((s) => s.id)
          )

        if (!unlockedError && unlocked) {
          const unlockedIds = new Set(unlocked.map((u) => u.sephira_id))
          const missing = previousSephirot.filter((s) => !unlockedIds.has(s.id))

          if (missing.length > 0) {
            return NextResponse.json(
              {
                success: false,
                error: "Must unlock previous Sephirot first",
              },
              { status: 400 }
            )
          }
        }
      }
    }

    // ✅ Calculate new points after unlock
    const pointsAfterCost = user.available_points - sephira.unlock_cost
    const newTotal = user.total_points - sephira.unlock_cost + sephira.unlock_reward
    const newAvailable = pointsAfterCost + sephira.unlock_reward
    const newLevel = calculateLevel(newTotal)

    // ✅ Unlock sephira
    const { error: unlockError } = await supabase.from("user_sephirot").insert({
      user_id: user.id,
      sephira_id: sephiraId,
    })

    if (unlockError) {
      console.error("[API] Error unlocking sephira:", unlockError)
      return NextResponse.json({ success: false, error: "Failed to unlock sephira" }, { status: 500 })
    }

    // ✅ Update user points
    const { error: updateError } = await supabase
      .from("users")
      .update({
        total_points: newTotal,
        available_points: newAvailable,
        level: newLevel,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[API] Error updating user points:", updateError)
      // Откатываем разблокировку
      await supabase.from("user_sephirot").delete().eq("user_id", user.id).eq("sephira_id", sephiraId)
      return NextResponse.json({ success: false, error: "Failed to update user points" }, { status: 500 })
    }

    // ✅ Record transaction for unlock reward
    const { error: rewardTxError } = await supabase.from("points_transactions").insert({
      user_id: user.id,
      amount: sephira.unlock_reward,
      type: "sephira_unlock",
      description: `Unlocked ${sephira.name}: +${sephira.unlock_reward} points`,
      metadata: {
        sephira_id: sephiraId,
        sephira_name: sephira.name,
        unlock_cost: sephira.unlock_cost,
        unlock_reward: sephira.unlock_reward,
      },
    })

    if (rewardTxError) {
      console.error("[API] Error recording reward transaction:", rewardTxError)
    }

    // ✅ Record transaction for unlock cost
    const { error: costTxError } = await supabase.from("points_transactions").insert({
      user_id: user.id,
      amount: -sephira.unlock_cost,
      type: "spent_sephira",
      description: `Unlocked ${sephira.name}: -${sephira.unlock_cost} points`,
      metadata: {
        sephira_id: sephiraId,
        sephira_name: sephira.name,
      },
    })

    if (costTxError) {
      console.error("[API] Error recording cost transaction:", costTxError)
    }

    // ✅ Распределение реферальных наград (только за награду за разблокировку)
    if (sephira.unlock_reward > 0) {
      try {
        await distributeReferralRewards(user.id, sephira.unlock_reward, "sephira_unlock")
      } catch (error) {
        console.error("[API] Error distributing referral rewards:", error)
      }
    }

    // ✅ Проверка достижений
    try {
      await checkAndAwardAchievements(user.id, "sephirot")
      if (newLevel >= 75) {
        await checkAndAwardAchievements(user.id, "level", { level: 75 })
      }
    } catch (error) {
      console.error("[API] Error checking achievements:", error)
    }

    return NextResponse.json({
      success: true,
      data: {
        sephira: {
          id: sephira.id,
          name: sephira.name,
          nameHebrew: sephira.name_hebrew,
          description: sephira.description,
          bonusDescription: sephira.bonus_description,
          bonusValue: sephira.bonus_value,
        },
        pointsChange: sephira.unlock_reward - sephira.unlock_cost,
        newTotal,
        newAvailable,
        newLevel,
      },
    })
  } catch (error) {
    console.error("[API] Error in POST /api/sephirot/unlock:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to unlock sephira"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}