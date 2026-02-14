import { type NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { calculateLevel } from "@/lib/db/users"
import { WHEEL_REWARDS, spinWheel, KCODE_REWARDS } from "@/lib/points/calculator"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"
import { distributeReferralRewards } from "@/lib/referrals/system"
import { rewardUserWithKcode } from "@/lib/web3/backend-contracts"
import { z } from "zod"

// Zod schema для валидации
const spinWheelSchema = z.object({
  useFree: z.boolean(),
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

    // Валидация request body
    const body = await request.json()
    const validationResult = spinWheelSchema.safeParse(body)

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

    const { useFree } = validationResult.data

    console.log("[API] POST /api/points/spin", {
      userId: userId.slice(0, 10) + "...",
      useFree,
    })

    // ✅ Rate limiting по userId
    const rateLimit = checkRateLimit(userId, "WHEEL_SPIN")
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
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        }
      )
    }

    let supabase
    try {
      // Use service role key for server-side operations
      const { createClient: createServiceClient } = await import("@supabase/supabase-js")
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
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

    // Check if can spin
    if (useFree && user.free_spins <= 0) {
      return NextResponse.json({ success: false, error: "No free spins available" }, { status: 400 })
    }

    // For paid spins, check KCODE balance (use total_kcode directly)
    const kcodeBalance = user.total_kcode || 0
    if (!useFree && kcodeBalance < KCODE_REWARDS.EXTRA_SPIN_COST) {
      return NextResponse.json({ 
        success: false, 
        error: `Not enough KCODE. Need ${KCODE_REWARDS.EXTRA_SPIN_COST} KCODE, have ${kcodeBalance}` 
      }, { status: 400 })
    }

    // Spin the wheel
    const reward = spinWheel()
    const rewardIndex = WHEEL_REWARDS.findIndex((r) => r.type === reward.type && r.value === reward.value)

    let kcodeChange = 0
    let tokensMinted = 0
    let transactionHash = ""
    let description = ""
    let rewardAmount = 0 // ✅ Сохраняем награду отдельно
    const updates: Record<string, unknown> = {
      free_spins: useFree ? user.free_spins - 1 : user.free_spins,
    }

    switch (reward.type) {
      case "kcode":
        // Use KCODE directly (no conversion)
        let baseReward = reward.value
        
        // Apply active multiplier if exists
        const now = Date.now()
        const multiplierActive = user.multiplier_expires_at && new Date(user.multiplier_expires_at).getTime() > now
        if (multiplierActive && user.active_multiplier > 1) {
          baseReward = baseReward * user.active_multiplier
        }
        description = `Wheel reward`
        kcodeChange = baseReward
        rewardAmount = baseReward // ✅ Сохраняем награду
        break

      case "jackpot":
        // Use KCODE directly (no conversion)
        let jackpotReward = reward.value
        
        // Apply active multiplier if exists
        const jackpotMultiplierActive = user.multiplier_expires_at && new Date(user.multiplier_expires_at).getTime() > now
        if (jackpotMultiplierActive && user.active_multiplier > 1) {
          jackpotReward = jackpotReward * user.active_multiplier
        }
        description = `Jackpot`
        kcodeChange = jackpotReward
        rewardAmount = jackpotReward // ✅ Сохраняем награду
        break

      case "pol":
        // POL reward - записываем в БД, но не минтим (POL выплачивается вручную или через отдельный контракт)
        rewardAmount = reward.value
        description = `POL reward`
        // POL не влияет на KCODE balance
        break

      case "multiplier":
        updates.active_multiplier = reward.value
        updates.multiplier_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        description = `Multiplier x${reward.value}`
        break

      case "boost":
        updates.active_boost_percent = reward.value
        updates.boost_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        description = `Boost +${reward.value}%`
        break
    }

    // Deduct cost if paid spin (use KCODE directly)
    if (!useFree) {
      kcodeChange -= KCODE_REWARDS.EXTRA_SPIN_COST
      
      // For paid spins, description stays simple
      if (reward.type === "kcode" || reward.type === "jackpot") {
        description = `Wheel reward`
      } else {
        description = `${description} (paid)`
      }
    }

    // ✅ Mint KCODE tokens for kcode/jackpot rewards using smart contract
    let alternativeReward = null
    let maxSupplyReached = false
    
    if (rewardAmount > 0 && (reward.type === "kcode" || reward.type === "jackpot")) {
      try {
        console.log("[API] 🔄 Rewarding KCODE tokens via smart contract:", {
          walletAddress: user.wallet_address,
          kcode: rewardAmount,
          activity: reward.type === "jackpot" ? 'wheel_jackpot' : 'wheel_spin'
        })

        transactionHash = await rewardUserWithKcode(
          user.wallet_address,
          rewardAmount,
          reward.type === "jackpot" ? 'wheel_jackpot' : 'wheel_spin'
        )
        
        tokensMinted = rewardAmount
        console.log("[API] ✅ Wheel tokens rewarded:", tokensMinted, "KCODE, TX:", transactionHash)
      } catch (mintError) {
        console.error("[API] ❌ Exception rewarding wheel tokens:", mintError)
        // Don't fail the entire request - user still gets database KCODE
      }
    }

    // Calculate new KCODE balance
    const newTotal = (user.total_kcode || 0) + kcodeChange
    
    updates.total_kcode = newTotal
    updates.tokens_minted = (user.tokens_minted || 0) + tokensMinted
    updates.level = calculateLevel(newTotal)

    // ✅ Атомарное обновление с проверкой ошибок
    const { error: updateError } = await supabase.from("users").update(updates).eq("id", user.id)

    if (updateError) {
      console.error("[API] Error updating user KCODE:", updateError)
      return NextResponse.json({ success: false, error: "Failed to update user KCODE" }, { status: 500 })
    }

    // ✅ Запись спина с обработкой ошибок и fallback для старой схемы
    try {
      const { error: spinError } = await supabase.from("wheel_spins").insert({
        user_id: user.id,
        reward_type: reward.type || 'kcode',
        reward_value: Math.floor(reward.value * 100), // Convert to integer (0.1 KCODE = 10)
        tokens_minted: tokensMinted,
        transaction_hash: transactionHash,
        is_free: useFree,
        alternative_reward: alternativeReward,
        max_supply_reached: maxSupplyReached
      })

      if (spinError) {
        console.error("[API] Error recording spin:", spinError)
        
        // Try fallback insert with minimal data if schema is old
        if (spinError.message.includes("tokens_minted") || 
            spinError.message.includes("reward_type") ||
            spinError.message.includes("invalid input syntax")) {
          console.log("[API] Attempting fallback spin record...")
          const { error: fallbackError } = await supabase.from("wheel_spins").insert({
            user_id: user.id,
            reward_type: reward.type || 'kcode',
            created_at: new Date().toISOString(),
          })
          
          if (fallbackError) {
            console.error("[API] Fallback spin record also failed:", fallbackError)
            // Don't rollback points, just log the issue
          } else {
            console.log("[API] Fallback spin record successful")
          }
        } else {
          // Откатываем обновление очков только для других ошибок
          await supabase
            .from("users")
            .update({
              total_points: user.total_points,
              available_points: user.available_points,
              free_spins: user.free_spins,
            })
            .eq("id", user.id)
          return NextResponse.json({ success: false, error: "Failed to record spin" }, { status: 500 })
        }
      }
    } catch (spinRecordError) {
      console.error("[API] Exception recording spin:", spinRecordError)
      // Don't fail the entire request for spin recording issues
    }

    // ✅ Запись транзакции в kcode_transactions
    const { error: transactionError } = await supabase.from("kcode_transactions").insert({
      user_id: user.id,
      amount: kcodeChange,
      type: "wheel_spin",
      description,
      tx_hash: transactionHash || undefined,
    })

    if (transactionError) {
      console.error("[API] Error recording transaction:", transactionError)
      // Не откатываем, так как основная операция выполнена
    }

    // ✅ Record in blockchain_transactions for TokenHistory component
    // Записываем награду только если есть реальный blockchain hash
    if (rewardAmount > 0 && (reward.type === "kcode" || reward.type === "jackpot") && transactionHash) {
      const { error: blockchainTxError } = await supabase.from("blockchain_transactions").insert({
        user_id: user.id,
        wallet_address: user.wallet_address,
        transaction_hash: transactionHash,
        transaction_type: 'reward',
        amount: rewardAmount.toString(),
        status: 'confirmed',
        description: `Wheel spin reward`,
        contract_address: process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS,
      })

      if (blockchainTxError) {
        console.error("[API] Error recording blockchain transaction:", blockchainTxError)
      } else {
        console.log("[API] ✅ Blockchain transaction recorded for TokenHistory (reward):", {
          rewardAmount,
          txHash: transactionHash
        })
      }
    }

    // ✅ Распределение реферальных наград (only for positive rewards)
    if (kcodeChange > 0) {
      try {
        await distributeReferralRewards(user.id, kcodeChange, "wheel_spin")
      } catch (error) {
        console.error("[API] Error distributing referral rewards:", error)
        // Не блокируем ответ
      }
    }

    return NextResponse.json({
      success: true,
      reward,
      rewardIndex,
      kcodeChange,
      tokensAwarded: tokensMinted,
      transactionHash: transactionHash,
      newTotal,
      freeSpins: updates.free_spins,
      activeMultiplier: updates.active_multiplier || user.active_multiplier || 1,
      activeBoost: updates.active_boost_percent || user.active_boost_percent || 0,
      maxSupplyReached,
      alternativeReward: alternativeReward ? {
        type: alternativeReward.type,
        message: alternativeReward.message,
        reward: alternativeReward.reward
      } : null
    })
  } catch (error) {
    console.error("[API] Error in POST /api/points/spin:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to spin"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}