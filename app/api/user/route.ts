import { type NextRequest, NextResponse } from "next/server"
import { getOrCreateUser, getUserByWallet } from "@/lib/db/users"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"
import { createReferralRelationships } from "@/lib/referrals/system"
import { checkAndAwardAchievements } from "@/lib/achievements/checker"

// GET user data by wallet
export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")

  if (!wallet) {
    return NextResponse.json({ success: false, error: "Wallet address required" }, { status: 400 })
  }

  // ✅ Валидация адреса
  if (!isValidEvmAddress(wallet)) {
    return NextResponse.json({ success: false, error: "Invalid wallet address format" }, { status: 400 })
  }

  // ✅ Rate limiting
  const rateLimit = checkRateLimit(wallet, "API_GENERAL")
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded", retryAfter: Math.ceil(rateLimit.resetIn / 1000) },
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

  try {
    console.log("[API] GET /api/user", { wallet: wallet.slice(0, 10) + "..." })
    const user = await getUserByWallet(wallet)

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error("[API] Error in GET /api/user:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to get user"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

// POST - create or get user (on wallet connect)
// ⚠️ ВАЖНО: Для полной безопасности этот endpoint должен требовать подпись
// Сейчас оставляем для обратной совместимости, но добавляем валидацию
export async function POST(request: NextRequest) {
  try {
    const { walletAddress, referralCode, signature, message } = await request.json()

    // ✅ Валидация входных данных
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "Wallet address required" }, { status: 400 })
    }

    if (!isValidEvmAddress(walletAddress)) {
      return NextResponse.json({ success: false, error: "Invalid wallet address format" }, { status: 400 })
    }

    // ✅ Валидация реферального кода
    if (referralCode && typeof referralCode !== "string") {
      return NextResponse.json({ success: false, error: "Invalid referral code format" }, { status: 400 })
    }

    // ✅ Rate limiting
    const rateLimit = checkRateLimit(walletAddress, "API_GENERAL")
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded", retryAfter: Math.ceil(rateLimit.resetIn / 1000) },
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

    console.log("[API] POST /api/user", { walletAddress: walletAddress.slice(0, 10) + "..." })

    // ⚠️ TODO: В будущем здесь должна быть проверка подписи через authenticateWithWallet
    // Сейчас используем getOrCreateUser для обратной совместимости
    const user = await getOrCreateUser(walletAddress)

    if (!user) {
      console.error("[API] Failed to create/get user:", walletAddress)
      return NextResponse.json({ success: false, error: "Failed to create user" }, { status: 500 })
    }

    // ✅ Handle referral if provided and user is new
    if (referralCode && !user.referred_by_code) {
      const referralResult = await createReferralRelationships(user.id, referralCode)
      if (!referralResult.success) {
        console.log("[API] Failed to process referral:", referralResult.error)
        // Не блокируем регистрацию, если реферальный код невалиден
      } else {
        console.log("[API] Referral relationship created successfully")
      }
    }

    // ✅ Проверка достижений для нового пользователя
    const isNewUser = user.created_at && new Date(user.created_at).getTime() > Date.now() - 60000 // создан менее минуты назад
    if (isNewUser) {
      try {
        await checkAndAwardAchievements(user.id, "onboarding")
      } catch (error) {
        console.error("[API] Error checking onboarding achievements:", error)
      }
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error("[API] Error in POST /api/user:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to process request"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
