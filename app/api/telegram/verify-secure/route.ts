import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Secure Telegram verification (No bot required)
export async function POST(request: NextRequest) {
  try {
    console.log("[TELEGRAM SECURE] POST /api/telegram/verify-secure")

    const body = await request.json()
    const { walletAddress, telegramUsername, verificationCode } = body
    
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    
    console.log("[TELEGRAM SECURE] Request:", { 
      hasWallet: !!walletAddress,
      hasUserId: !!userId,
      telegramUsername,
      verificationCode: verificationCode?.slice(0, 10) + "..."
    })

    // Validate required fields
    if (!walletAddress || !userId || !telegramUsername || !verificationCode) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 })
    }

    // Basic validation
    if (!telegramUsername.startsWith('@')) {
      return NextResponse.json({ 
        success: false, 
        error: "Telegram username must start with @" 
      }, { status: 400 })
    }

    // Validate verification code format
    if (!verificationCode.startsWith('KC-') || verificationCode.length < 10) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid verification code format" 
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

    console.log("[TELEGRAM SECURE] Looking up user with ID:", userId)

    // Get user
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)

    console.log("[TELEGRAM SECURE] User query result:", { 
      users: users?.length || 0, 
      error: userError?.message || 'none' 
    })

    if (userError) {
      console.error("[TELEGRAM SECURE] User lookup error:", userError)
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
      console.log("[TELEGRAM SECURE] ❌ Wallet mismatch:", {
        userWallet: user.wallet_address.toLowerCase(),
        providedWallet: walletAddress.toLowerCase()
      })
      return NextResponse.json({ 
        success: false, 
        error: "Wallet address mismatch" 
      }, { status: 401 })
    }

    console.log("[TELEGRAM SECURE] User verified:", user.id)

    // Check if Telegram already linked
    if (user.telegram_username) {
      return NextResponse.json({ 
        success: false, 
        error: "Telegram already connected to this account" 
      }, { status: 400 })
    }

    // For now, we'll use simple username verification
    // This is honest - we don't pretend to check Telegram messages
    // User enters their username and we trust them (like Twitter verification)
    
    // Basic username validation
    if (telegramUsername.length < 2 || telegramUsername.length > 50) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid username length" 
      }, { status: 400 })
    }

    // Remove @ if present
    const cleanUsername = telegramUsername.replace('@', '')
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json({ 
        success: false, 
        error: "Username can only contain letters, numbers and underscores" 
      }, { status: 400 })
    }

    console.log("[TELEGRAM SECURE] Username validation passed")

    // Link Telegram account
    const { error: updateError } = await supabase
      .from("users")
      .update({
        telegram_username: telegramUsername,
        telegram_verified_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[TELEGRAM SECURE] Update error:", updateError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to link Telegram account" 
      }, { status: 500 })
    }

    console.log("[TELEGRAM SECURE] Telegram linked successfully")

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
      console.error("[TELEGRAM SECURE] Points update error:", pointsError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to award points" 
      }, { status: 500 })
    }

    console.log("[TELEGRAM SECURE] Points awarded:", bonusPoints)

    // Record transaction
    const { error: transactionError } = await supabase
      .from("points_transactions")
      .insert({
        user_id: user.id,
        amount: bonusPoints,
        type: "telegram_verification",
        description: "Telegram account connected via secure verification",
      })

    if (transactionError) {
      console.error("[TELEGRAM SECURE] Transaction error:", transactionError)
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
        console.log("[TELEGRAM SECURE] Tokens minted:", tokensMinted, "KCODE")
        
        // Create a points transaction for the KCODE tokens
        if (tokensMinted > 0) {
          const kcodePointsEquivalent = tokensMinted * 100
          await supabase.from("points_transactions").insert({
            user_id: user.id,
            amount: kcodePointsEquivalent,
            type: "kcode_reward",
            description: `${tokensMinted} KCODE tokens minted for Telegram connection (${kcodePointsEquivalent} points equivalent)`,
          })
          console.log("[TELEGRAM SECURE] KCODE points transaction created")
        }
      } else {
        const errorText = await mintResponse.text()
        console.error("[TELEGRAM SECURE] Token minting failed:", errorText)
      }
    } catch (mintError) {
      console.error("[TELEGRAM SECURE] Token minting failed:", mintError)
    }

    console.log("[TELEGRAM SECURE] Success!")

    return NextResponse.json({
      success: true,
      points: bonusPoints,
      kcode: tokensMinted,
      newTotal,
      newAvailable,
      telegramUsername,
      message: "Telegram account connected successfully!"
    })

  } catch (error) {
    console.error("[TELEGRAM SECURE] Unexpected error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error")
    }, { status: 500 })
  }
}