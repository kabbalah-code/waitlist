import { type NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"

// POST - Start Telegram Login Widget flow (No bot required)
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Wallet address is required" },
        { status: 400 }
      )
    }

    // Rate limiting по wallet address
    const rateLimit = checkRateLimit(walletAddress, "API_GENERAL")
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

    console.log("[Telegram Login] Starting login flow for wallet:", walletAddress.slice(0, 10) + "...")

    // Use service role client for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Find user by wallet address
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, telegram_username')
      .ilike('wallet_address', walletAddress)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not found. Please connect your wallet first." },
        { status: 404 }
      )
    }

    // Check if Telegram is already connected
    if (user.telegram_username) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Telegram account ${user.telegram_username} is already connected to this wallet.`,
          code: "ALREADY_CONNECTED"
        },
        { status: 400 }
      )
    }

    // Generate secure state for CSRF protection
    const state = generateSecureState()
    
    // Store state in database with expiration
    const { error: stateError } = await supabase
      .from("oauth_states")
      .upsert({
        user_id: user.id,
        platform: 'telegram',
        state,
        wallet_address: walletAddress,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform'
      })

    if (stateError) {
      console.error('[Telegram Login] Error saving state:', stateError)
      return NextResponse.json(
        { success: false, error: "Failed to initialize login flow. Please try again." },
        { status: 500 }
      )
    }

    console.log("[Telegram Login] Generated state for user:", user.id)

    return NextResponse.json({
      success: true,
      state,
      userId: user.id,
      expiresIn: 600 // 10 minutes
    })

  } catch (error) {
    console.error("[API] Error in POST /api/auth/telegram/oauth:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

function generateSecureState(): string {
  // Generate cryptographically secure random state
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result + '_' + Date.now().toString(36)
}