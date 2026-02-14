import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"

// POST - check if Telegram is connected (simplified version)
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
    const rateLimit = checkRateLimit(userId, "TELEGRAM_CHECK")
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        },
        { status: 429 }
      )
    }

    const { walletAddress } = await request.json()

    const supabase = await createClient()

    // Get user by userId
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, wallet_address, telegram_username, telegram_verified_at")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // For now, we'll use a simple verification method
    // In production, this would integrate with Telegram Bot API
    
    // Check if user has telegram_username set (would be set by our social verification system)
    if (user.telegram_username && user.telegram_verified_at) {
      return NextResponse.json({
        connected: true,
        username: user.telegram_username
      })
    }

    // If not connected through our system, return not connected
    return NextResponse.json({
      connected: false,
      message: "Please use the social verification system in your profile"
    })

  } catch (error) {
    console.error("[API] Error in POST /api/telegram/check:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}