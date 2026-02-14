import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserByWallet } from "@/lib/db/users"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"
import { checkAndAwardAchievements } from "@/lib/achievements/checker"

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, discordUsername } = await request.json()

    // ✅ Валидация входных данных
    if (!walletAddress || !discordUsername) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    if (!isValidEvmAddress(walletAddress)) {
      return NextResponse.json({ success: false, error: "Invalid wallet address format" }, { status: 400 })
    }

    // Валидация Discord username (формат: username#1234 или username)
    const normalizedUsername = discordUsername.toLowerCase().trim()
    if (!/^[a-z0-9_]{2,32}(#\d{4})?$/.test(normalizedUsername)) {
      return NextResponse.json(
        { success: false, error: "Invalid Discord username format. Use username#1234 or username" },
        { status: 400 },
      )
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

    console.log("[API] POST /api/discord/connect", { walletAddress: walletAddress.slice(0, 10) + "...", discordUsername })

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
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // ✅ Check if Discord already linked to another wallet
    const { data: existingDiscordUser, error: checkError } = await supabase
      .from("users")
      .select("wallet_address")
      .eq("discord_username", normalizedUsername)
      .maybeSingle()

    if (checkError) {
      console.error("[API] Error checking existing Discord user:", checkError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    if (existingDiscordUser && existingDiscordUser.wallet_address !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "This Discord account is already linked to another wallet" },
        { status: 400 },
      )
    }

    // ✅ Update user with Discord info
    const { error: updateError } = await supabase
      .from("users")
      .update({
        discord_username: normalizedUsername,
        discord_verified_at: new Date().toISOString(),
      })
      .eq("wallet_address", walletAddress.toLowerCase())

    if (updateError) {
      console.error("[API] Error updating user:", updateError)
      return NextResponse.json({ success: false, error: "Failed to save Discord connection" }, { status: 500 })
    }

    // ✅ Проверка достижений (если это первое подключение)
    if (!user.discord_username) {
      try {
        await checkAndAwardAchievements(user.id, "onboarding")
      } catch (error) {
        console.error("[API] Error checking achievements:", error)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        username: normalizedUsername,
      },
    })
  } catch (error) {
    console.error("[API] Error in POST /api/discord/connect:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to connect Discord"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}


