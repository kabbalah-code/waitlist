import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DIRECT Telegram verification API - bypasses middleware
export async function POST(request: NextRequest) {
  try {
    console.log("[TELEGRAM DIRECT] POST /api/telegram/verify-direct")

    const body = await request.json()
    const { walletAddress, userId, telegramUsername } = body
    
    console.log("[TELEGRAM DIRECT] Request:", { 
      hasWallet: !!walletAddress,
      hasUserId: !!userId,
      telegramUsername
    })

    // Validate required fields
    if (!walletAddress || !userId || !telegramUsername) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields: walletAddress, userId, telegramUsername" 
      }, { status: 400 })
    }

    // Basic validation
    if (!telegramUsername.startsWith('@')) {
      return NextResponse.json({ 
        success: false, 
        error: "Telegram username must start with @" 
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if Telegram account is already linked to another user
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_username", telegramUsername)
      .neq("id", userId)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: "This Telegram account is already linked to another user" 
      }, { status: 400 })
    }

    console.log("[TELEGRAM DIRECT] Looking up user with ID:", userId)

    // Get user
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)

    console.log("[TELEGRAM DIRECT] User query result:", { 
      users: users?.length || 0, 
      error: userError?.message || 'none' 
    })

    if (userError) {
      console.error("[TELEGRAM DIRECT] User lookup error:", userError)
      return NextResponse.json({ 
        success: false, 
        error: "Database error: " + userError.message
      }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "User not found"
      }, { status: 404 })
    }

    const user = users[0]

    // Verify wallet matches (case insensitive)
    if (user.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      console.log("[TELEGRAM DIRECT] ❌ Wallet mismatch:", {
        userWallet: user.wallet_address.toLowerCase(),
        providedWallet: walletAddress.toLowerCase()
      })
      return NextResponse.json({ 
        success: false, 
        error: "Wallet address mismatch" 
      }, { status: 401 })
    }

    console.log("[TELEGRAM DIRECT] User verified:", user.id)

    // Check if Telegram already linked
    if (user.telegram_username) {
      return NextResponse.json({ 
        success: false, 
        error: "Telegram already connected to this account" 
      }, { status: 400 })
    }

    // Check if this Telegram username is already used
    const { data: existingUsers, error: checkError } = await supabase
      .from("users")
      .select("id, wallet_address")
      .eq("telegram_username", telegramUsername)

    if (checkError) {
      console.error("[TELEGRAM DIRECT] Check existing error:", checkError)
      return NextResponse.json({ 
        success: false, 
        error: "Database error checking existing username" 
      }, { status: 500 })
    }

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: "This Telegram username is already connected to another account" 
      }, { status: 400 })
    }

    // Link Telegram account
    const { error: updateError } = await supabase
      .from("users")
      .update({
        telegram_username: telegramUsername,
        telegram_verified_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[TELEGRAM DIRECT] Update error:", updateError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to link Telegram account" 
      }, { status: 500 })
    }

    console.log("[TELEGRAM DIRECT] Telegram linked successfully")

    // Award bonus points (100 points + 1 KCODE)
    const bonusPoints = 100
    const newTotal = user.total_points + bonusPoints
    const newAvailable = user.available_points + bonusPoints

    const { error: pointsError } = await supabase
      .from("users")
      .update({
        total_points: newTotal,
        available_points: newAvailable,
      })
      .eq("id", user.id)

    if (pointsError) {
      console.error("[TELEGRAM DIRECT] Points update error:", pointsError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to award points" 
      }, { status: 500 })
    }

    console.log("[TELEGRAM DIRECT] Points awarded:", bonusPoints)

    // Record transaction
    const { error: transactionError } = await supabase
      .from("points_transactions")
      .insert({
        user_id: user.id,
        amount: bonusPoints,
        type: "telegram_verification",
        description: "Telegram account connected",
      })

    if (transactionError) {
      console.error("[TELEGRAM DIRECT] Transaction error:", transactionError)
      // Don't fail the request for transaction logging errors
    }

    // Try to mint KCODE tokens (1 KCODE = 100 points)
    let tokensMinted = 0
    try {
      const mintResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/internal/mint-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.INTERNAL_API_KEY || 'dev-key'
        },
        body: JSON.stringify({
          walletAddress: user.wallet_address,
          points: 100, // 1 KCODE
          activity: 'telegram_connection'
        })
      })

      if (mintResponse.ok) {
        const mintResult = await mintResponse.json()
        tokensMinted = mintResult.tokensAwarded || 0
        console.log("[TELEGRAM DIRECT] Tokens minted:", tokensMinted, "KCODE")
        
        // Create a points transaction for the KCODE tokens
        if (tokensMinted > 0) {
          // Store KCODE as points equivalent (1 KCODE = 100 points)
          const kcodePointsEquivalent = tokensMinted * 100
          await supabase.from("points_transactions").insert({
            user_id: user.id,
            amount: kcodePointsEquivalent,
            type: "kcode_reward",
            description: `${tokensMinted} KCODE tokens minted for Telegram connection (${kcodePointsEquivalent} points equivalent)`,
          })
          console.log("[TELEGRAM DIRECT] KCODE points transaction created")
        }
      } else {
        const errorText = await mintResponse.text()
        console.error("[TELEGRAM DIRECT] Token minting failed:", errorText)
      }
    } catch (mintError) {
      console.error("[TELEGRAM DIRECT] Token minting failed:", mintError)
    }

    console.log("[TELEGRAM DIRECT] Success!")

    return NextResponse.json({
      success: true,
      points: bonusPoints,
      newTotal,
      newAvailable,
      telegramUsername,
      message: "Telegram account connected successfully!"
    })

  } catch (error) {
    console.error("[TELEGRAM DIRECT] Unexpected error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error")
    }, { status: 500 })
  }
}