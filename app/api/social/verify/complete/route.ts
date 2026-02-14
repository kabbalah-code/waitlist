import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"
import { distributeReferralRewards } from "@/lib/referrals/system"
import { z } from "zod"

const completeVerificationSchema = z.object({
  platform: z.enum(['twitter', 'telegram', 'discord']),
  username: z.string().min(1).max(50)
})

// Очки за верификацию каждой платформы
const PLATFORM_POINTS = {
  twitter: 100,
  telegram: 75,
  discord: 50
}

// POST - завершить верификацию социального аккаунта
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimit = checkRateLimit(userId, "SOCIAL_VERIFY")
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many verification attempts. Try again later.",
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validationResult = completeVerificationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: validationResult.error.flatten()
        },
        { status: 400 }
      )
    }

    const { platform, username } = validationResult.data

    console.log(`[Social] Completing ${platform} verification for user ${userId}`)

    const supabase = await createClient()

    // Получаем код верификации
    const { data: verification, error: verificationError } = await supabase
      .from("social_verifications")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", platform)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single()

    if (verificationError || !verification) {
      return NextResponse.json(
        { success: false, error: "Verification not found or expired. Please start again." },
        { status: 400 }
      )
    }

    if (verification.username !== username) {
      return NextResponse.json(
        { success: false, error: "Username mismatch" },
        { status: 400 }
      )
    }

    // Здесь в реальном приложении была бы проверка через API социальных сетей
    // Для простоты считаем верификацию успешной через 30 секунд после создания
    const timeSinceCreation = Date.now() - new Date(verification.created_at).getTime()
    if (timeSinceCreation < 30000) { // 30 секунд
      return NextResponse.json(
        { success: false, error: "Please wait at least 30 seconds after posting before verification" },
        { status: 400 }
      )
    }

    // Получаем пользователя
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // Проверяем, не привязан ли уже этот аккаунт
    const verifiedAtColumn = `${platform}_verified_at`
    if (user[verifiedAtColumn]) {
      return NextResponse.json(
        { success: false, error: `${platform} account already verified` },
        { status: 400 }
      )
    }

    // Обновляем пользователя
    const pointsAwarded = PLATFORM_POINTS[platform]
    const updates = {
      [`${platform}_username`]: username,
      [`${platform}_verified_at`]: new Date().toISOString(),
      total_points: user.total_points + pointsAwarded,
      available_points: user.available_points + pointsAwarded
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)

    if (updateError) {
      console.error(`[Social] Error updating user:`, updateError)
      return NextResponse.json(
        { success: false, error: "Failed to update user" },
        { status: 500 }
      )
    }

    // Отмечаем верификацию как завершенную
    await supabase
      .from("social_verifications")
      .update({ status: 'completed' })
      .eq("user_id", userId)
      .eq("platform", platform)

    // Записываем транзакцию очков
    await supabase.from("points_transactions").insert({
      user_id: userId,
      amount: pointsAwarded,
      type: "social_verification",
      description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} account verification`
    })

    // Распределяем реферальные награды
    try {
      await distributeReferralRewards(userId, pointsAwarded, "social_verification")
    } catch (error) {
      console.error("[Social] Error distributing referral rewards:", error)
    }

    // Mint KCODE tokens for social verification
    try {
      const mintResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/internal/mint-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.INTERNAL_API_KEY || 'dev-key'
        },
        body: JSON.stringify({
          walletAddress: user.wallet_address,
          points: pointsAwarded,
          activity: `social_${platform}`
        })
      })

      if (mintResponse.ok) {
        const mintResult = await mintResponse.json()
        if (mintResult.success) {
          console.log(`[Social] Minted ${mintResult.tokensAwarded} KCODE for ${platform} verification`)
        }
      }
    } catch (mintError) {
      console.error("[Social] Error minting tokens:", mintError)
    }

    console.log(`[Social] ✅ ${platform} verification completed for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: `${platform} account verified successfully`,
      pointsAwarded,
      platform,
      username
    })

  } catch (error) {
    console.error("[API] Error in POST /api/social/verify/complete:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}