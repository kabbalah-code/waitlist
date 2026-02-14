import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"
import { z } from "zod"

const startVerificationSchema = z.object({
  platform: z.enum(['twitter', 'telegram', 'discord']),
  username: z.string().min(1).max(50),
  verificationCode: z.string().min(10).max(500)
})

// POST - начать верификацию социального аккаунта
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
    const validationResult = startVerificationSchema.safeParse(body)

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

    const { platform, username, verificationCode } = validationResult.data

    console.log(`[Social] Starting ${platform} verification for user ${userId}`)

    const supabase = await createClient()

    // Проверяем, не привязан ли уже этот username к другому пользователю
    const columnName = `${platform}_username`
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id, wallet_address")
      .eq(columnName, username)
      .neq("id", userId)
      .maybeSingle()

    if (checkError) {
      console.error(`[Social] Error checking existing ${platform} username:`, checkError)
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `This ${platform} account is already linked to another wallet` },
        { status: 400 }
      )
    }

    // Сохраняем код верификации во временную таблицу
    const { error: insertError } = await supabase
      .from("social_verifications")
      .upsert({
        user_id: userId,
        platform,
        username,
        verification_code: verificationCode,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 минут
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform'
      })

    if (insertError) {
      console.error(`[Social] Error saving verification code:`, insertError)
      return NextResponse.json(
        { success: false, error: "Failed to start verification" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Verification started for ${platform}`,
      expiresIn: 30 * 60 // 30 minutes in seconds
    })

  } catch (error) {
    console.error("[API] Error in POST /api/social/verify/start:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}