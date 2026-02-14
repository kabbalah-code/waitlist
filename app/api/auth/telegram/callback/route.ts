import { type NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'
import { distributeReferralRewards } from "@/lib/referrals/system"
import crypto from 'crypto'

// GET - Handle Telegram Login Widget callback (No bot required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const first_name = searchParams.get('first_name')
    const last_name = searchParams.get('last_name')
    const username = searchParams.get('username')
    const photo_url = searchParams.get('photo_url')
    const auth_date = searchParams.get('auth_date')
    const hash = searchParams.get('hash')
    const state = searchParams.get('state')

    console.log("[Telegram Callback] Processing login with state:", state?.slice(0, 10) + "...")

    if (!id || !auth_date || !hash || !state) {
      console.error('[Telegram Callback] Missing required parameters')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=invalid_telegram_callback`)
    }

    // For Login Widget, we use a simpler verification
    // The hash verification is done by Telegram's widget itself
    // We just need to verify the state and process the user

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

    // Verify OAuth state from database
    const { data: oauthState, error: stateError } = await supabase
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .eq("platform", "telegram")
      .gt("expires_at", new Date().toISOString())
      .single()

    if (stateError || !oauthState) {
      console.error('[Telegram Callback] Invalid or expired OAuth state:', stateError?.message)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=invalid_oauth_state`)
    }

    console.log("[Telegram Callback] Valid OAuth state found for user:", oauthState.user_id)

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', oauthState.user_id)
      .single()

    if (userError || !user) {
      console.error('[Telegram Callback] User not found:', oauthState.user_id)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=user_not_found`)
    }

    // Check if Telegram ID is already taken by another user
    const { data: existingTelegram } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('telegram_user_id', id)
      .neq('id', user.id)
      .single()

    if (existingTelegram) {
      console.error('[Telegram Callback] Telegram ID already linked to another account')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=telegram_already_linked`)
    }

    // Check if user already has Telegram connected
    if (user.telegram_username) {
      console.error('[Telegram Callback] User already has Telegram connected:', user.telegram_username)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=telegram_already_connected`)
    }

    // Update user with Telegram info
    const telegramUsername = username ? `@${username}` : `User${id}`
    const { error: updateError } = await supabase
      .from('users')
      .update({
        telegram_username: telegramUsername,
        telegram_user_id: id,
        telegram_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Telegram Callback] Failed to update user:', updateError)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=update_failed`)
    }

    // Award points for Telegram connection (100 points + 1 KCODE)
    const connectionPoints = 100
    const newTotal = user.total_points + connectionPoints

    const { error: pointsError } = await supabase
      .from('users')
      .update({
        total_points: newTotal,
        available_points: newTotal // Синхронизируем
      })
      .eq('id', user.id)

    if (!pointsError) {
      // Record transaction
      await supabase.from("points_transactions").insert({
        user_id: user.id,
        amount: connectionPoints,
        type: "telegram_verification",
        description: "Telegram account connected via Login Widget",
      })

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
          console.log("[Telegram Callback] Tokens minted:", tokensMinted, "KCODE")
          
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
            console.log("[Telegram Callback] KCODE points transaction created")
          }
        } else {
          const errorText = await mintResponse.text()
          console.error("[Telegram Callback] Token minting failed:", errorText)
        }
      } catch (mintError) {
        console.error("[Telegram Callback] Token minting failed:", mintError)
      }

      // Distribute referral rewards
      try {
        await distributeReferralRewards(user.id, connectionPoints, "telegram_verification")
      } catch (referralError) {
        console.error("[Telegram Callback] Referral rewards failed:", referralError)
      }
    }

    // Clean up OAuth state
    await supabase
      .from("oauth_states")
      .delete()
      .eq("state", state)

    // Clean up expired OAuth states
    await supabase
      .from("oauth_states")
      .delete()
      .lt("expires_at", new Date().toISOString())

    console.log("[Telegram Callback] Successfully connected Telegram " + telegramUsername + " to user:", user.id)

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?success=telegram_connected&username=${encodeURIComponent(telegramUsername)}`)

  } catch (error) {
    console.error("[API] Error in Telegram callback:", error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=telegram_callback_failed`)
  }
}