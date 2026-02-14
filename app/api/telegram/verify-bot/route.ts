import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createTelegramBot } from '@/lib/telegram/bot-api'

// POST - Real Telegram verification with Bot API
export async function POST(request: NextRequest) {
  try {
    console.log("[TELEGRAM BOT] POST /api/telegram/verify-bot")

    const body = await request.json()
    const { walletAddress, telegramUsername, verificationCode } = body
    
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    
    console.log("[TELEGRAM BOT] Request:", { 
      hasWallet: !!walletAddress,
      hasUserId: !!userId,
      telegramUsername,
      verificationCode: verificationCode?.slice(0, 10) + "..."
    })

    // Special case: GET_BOT_INFO - just return bot username
    if (verificationCode === 'GET_BOT_INFO') {
      console.log("[TELEGRAM BOT] Getting bot info...")
      const bot = createTelegramBot()
      if (bot) {
        const botInfo = await bot.getMe()
        if (botInfo) {
          console.log("[TELEGRAM BOT] Bot info retrieved:", botInfo.username)
          return NextResponse.json({ 
            success: false, 
            botUsername: botInfo.username,
            message: "Bot info retrieved"
          })
        }
      }
      return NextResponse.json({ 
        success: false, 
        error: "Could not get bot info" 
      }, { status: 503 })
    }

    // Validate required fields for normal verification
    if (!walletAddress || !userId || !telegramUsername || !verificationCode) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 })
    }

    // Basic validation for normal verification
    if (!telegramUsername.startsWith('@')) {
      return NextResponse.json({ 
        success: false, 
        error: "Telegram username must start with @" 
      }, { status: 400 })
    }

    // Clean username (remove @)
    const cleanUsername = telegramUsername.replace('@', '')

    // Validate verification code format
    if (!verificationCode.startsWith('KC-') || verificationCode.length < 10) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid verification code format" 
      }, { status: 400 })
    }

    // Verify the verification code matches wallet
    const expectedCodePrefix = `KC-${walletAddress.slice(-6).toUpperCase()}`
    if (!verificationCode.startsWith(expectedCodePrefix)) {
      const userCodePrefix = verificationCode.split('-')[1] || 'unknown'
      return NextResponse.json({ 
        success: false, 
        error: `Verification code doesn't match your current wallet.\n\n` +
               `Expected code starting with: ${expectedCodePrefix}\n` +
               `Your code starts with: KC-${userCodePrefix}\n\n` +
               `This usually means:\n` +
               `• You switched wallets in MetaMask\n` +
               `• You're using an old verification code\n` +
               `• Please generate a new code with your current wallet`
      }, { status: 400 })
    }

    // Create Telegram Bot instance
    const bot = createTelegramBot()
    if (!bot) {
      return NextResponse.json({ 
        success: false, 
        error: "Telegram Bot not configured. Please contact support." 
      }, { status: 503 })
    }

    console.log("[TELEGRAM BOT] Checking bot connection...")

    // Test bot connection
    const botInfo = await bot.getMe()
    if (!botInfo) {
      return NextResponse.json({ 
        success: false, 
        error: "Cannot connect to Telegram Bot. Please try again later." 
      }, { status: 503 })
    }

    console.log("[TELEGRAM BOT] Bot connected:", botInfo.username)

    // Check if user sent the verification code
    console.log("[TELEGRAM BOT] Checking for verification message...")
    const messageFound = await bot.checkUserMessage(cleanUsername, verificationCode, 600) // 10 minutes window

    if (!messageFound) {
      return NextResponse.json({ 
        success: false, 
        error: `Verification code not found. Please send "${verificationCode}" to our bot @${botInfo.username} and try again.`,
        botUsername: botInfo.username
      }, { status: 400 })
    }

    console.log("[TELEGRAM BOT] Verification message found!")

    // Get user info from Telegram
    const telegramUser = await bot.getUserInfo(cleanUsername)
    if (!telegramUser) {
      return NextResponse.json({ 
        success: false, 
        error: "Cannot find user info. Please make sure you've sent a message to our bot." 
      }, { status: 400 })
    }

    console.log("[TELEGRAM BOT] Telegram user found:", telegramUser.id, telegramUser.username)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if Telegram account is already linked to another user
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, wallet_address")
      .eq("telegram_username", telegramUsername)
      .neq("id", userId)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: "This Telegram account is already linked to another user" 
      }, { status: 400 })
    }

    // Check if Telegram ID is already used (skip this check since column doesn't exist)
    // const { data: existingTelegramId } = await supabase
    //   .from("users")
    //   .select("id, wallet_address")
    //   .eq("telegram_user_id", telegramUser.id.toString())
    //   .neq("id", userId)
    //   .maybeSingle()

    // if (existingTelegramId) {
    //   return NextResponse.json({ 
    //     success: false, 
    //     error: "This Telegram account is already linked to another wallet" 
    //   }, { status: 400 })
    // }

    console.log("[TELEGRAM BOT] Looking up user with ID:", userId)

    // Get user
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)

    if (userError || !users || users.length === 0) {
      console.error("[TELEGRAM BOT] User lookup error:", userError)
      return NextResponse.json({ 
        success: false, 
        error: "User not found" 
      }, { status: 404 })
    }

    const user = users[0]

    // Verify wallet matches
    if (user.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      console.log("[TELEGRAM BOT] ❌ Wallet mismatch")
      return NextResponse.json({ 
        success: false, 
        error: "Wallet address mismatch" 
      }, { status: 401 })
    }

    // Check if Telegram already linked
    if (user.telegram_username) {
      return NextResponse.json({ 
        success: false, 
        error: "Telegram already connected to this account" 
      }, { status: 400 })
    }

    console.log("[TELEGRAM BOT] User verified, linking Telegram account...")

    // Link Telegram account
    const { error: updateError } = await supabase
      .from("users")
      .update({
        telegram_username: telegramUsername,
        telegram_verified_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[TELEGRAM BOT] Update error:", updateError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to link Telegram account" 
      }, { status: 500 })
    }

    console.log("[TELEGRAM BOT] Telegram linked successfully")

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
      console.error("[TELEGRAM BOT] Points update error:", pointsError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to award points" 
      }, { status: 500 })
    }

    console.log("[TELEGRAM BOT] Points awarded:", bonusPoints)

    // Record transaction
    const { error: transactionError } = await supabase
      .from("points_transactions")
      .insert({
        user_id: user.id,
        amount: bonusPoints,
        type: "telegram_verification",
        description: "Telegram account verified via Bot API",
      })

    if (transactionError) {
      console.error("[TELEGRAM BOT] Transaction error:", transactionError)
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
        console.log("[TELEGRAM BOT] Tokens minted:", tokensMinted, "KCODE")
        
        // Create a points transaction for the KCODE tokens
        if (tokensMinted > 0) {
          const kcodePointsEquivalent = tokensMinted * 100
          await supabase.from("points_transactions").insert({
            user_id: user.id,
            amount: kcodePointsEquivalent,
            type: "kcode_reward",
            description: `${tokensMinted} KCODE tokens minted for Telegram connection (${kcodePointsEquivalent} points equivalent)`,
          })
          console.log("[TELEGRAM BOT] KCODE points transaction created")
        }
      } else {
        const errorText = await mintResponse.text()
        console.error("[TELEGRAM BOT] Token minting failed:", errorText)
      }
    } catch (mintError) {
      console.error("[TELEGRAM BOT] Token minting failed:", mintError)
    }

    // Send confirmation message to user
    try {
      await bot.sendMessage(
        telegramUser.id,
        `🎉 <b>Telegram Connected Successfully!</b>\n\n` +
        `Your account <b>@${cleanUsername}</b> has been linked to your wallet.\n\n` +
        `<b>Rewards received:</b>\n` +
        `• 100 points\n` +
        `• ${tokensMinted} KCODE tokens\n\n` +
        `Welcome to Kabbalah Code Game! 🚀`
      )
    } catch (messageError) {
      console.error("[TELEGRAM BOT] Failed to send confirmation message:", messageError)
    }

    console.log("[TELEGRAM BOT] Success!")

    return NextResponse.json({
      success: true,
      points: bonusPoints,
      kcode: tokensMinted,
      newTotal,
      newAvailable,
      telegramUsername,
      telegramId: telegramUser.id,
      message: "Telegram account verified and connected successfully!"
    })

  } catch (error) {
    console.error("[TELEGRAM BOT] Unexpected error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error")
    }, { status: 500 })
  }
}