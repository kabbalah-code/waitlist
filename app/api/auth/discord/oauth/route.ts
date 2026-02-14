import { type NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"

// POST - Start Discord OAuth flow (Production version)
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

    console.log("[Discord OAuth] Starting OAuth flow for wallet:", walletAddress.slice(0, 10) + "...")

    // Check Discord configuration
    const clientId = process.env.DISCORD_CLIENT_ID
    const clientSecret = process.env.DISCORD_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      console.error('[Discord OAuth] Discord credentials not configured')
      return NextResponse.json(
        { 
          success: false, 
          error: "Discord integration is not configured. Please contact support.",
          code: "DISCORD_NOT_CONFIGURED"
        },
        { status: 503 }
      )
    }

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
      .select('id, discord_username')
      .ilike('wallet_address', walletAddress)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not found. Please connect your wallet first." },
        { status: 404 }
      )
    }

    // Check if Discord is already connected
    if (user.discord_username) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Discord account @${user.discord_username} is already connected to this wallet.`,
          code: "ALREADY_CONNECTED"
        },
        { status: 400 }
      )
    }

    // Generate secure OAuth state
    const state = generateSecureState()
    
    // Store OAuth state in database with expiration
    const { error: stateError } = await supabase
      .from("oauth_states")
      .upsert({
        user_id: user.id,
        platform: 'discord',
        state,
        wallet_address: walletAddress,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform'
      })

    if (stateError) {
      console.error('[Discord OAuth] Error saving state:', stateError)
      return NextResponse.json(
        { success: false, error: "Failed to initialize OAuth flow. Please try again." },
        { status: 500 }
      )
    }

    // Generate Discord OAuth URL
    const redirectUri = encodeURIComponent(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/discord/callback`)
    const scope = encodeURIComponent('identify')
    
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&prompt=consent`

    console.log("[Discord OAuth] Generated auth URL for user:", user.id)

    return NextResponse.json({
      success: true,
      authUrl,
      state,
      expiresIn: 600 // 10 minutes
    })

  } catch (error) {
    console.error("[API] Error in POST /api/auth/discord/oauth:", error)
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