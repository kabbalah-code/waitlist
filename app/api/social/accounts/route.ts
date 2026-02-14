import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - получить привязанные социальные аккаунты
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Получаем пользователя с социальными аккаунтами
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(`
        id,
        twitter_username,
        twitter_verified_at,
        telegram_username,
        telegram_verified_at,
        discord_username,
        discord_verified_at
      `)
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // Формируем список аккаунтов
    const accounts = []

    if (user.twitter_username) {
      accounts.push({
        platform: 'twitter',
        username: user.twitter_username,
        verified: !!user.twitter_verified_at,
        verifiedAt: user.twitter_verified_at,
        points: 100
      })
    }

    if (user.telegram_username) {
      accounts.push({
        platform: 'telegram',
        username: user.telegram_username,
        verified: !!user.telegram_verified_at,
        verifiedAt: user.telegram_verified_at,
        points: 75
      })
    }

    if (user.discord_username) {
      accounts.push({
        platform: 'discord',
        username: user.discord_username,
        verified: !!user.discord_verified_at,
        verifiedAt: user.discord_verified_at,
        points: 50
      })
    }

    return NextResponse.json({
      success: true,
      accounts
    })

  } catch (error) {
    console.error("[API] Error in GET /api/social/accounts:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}