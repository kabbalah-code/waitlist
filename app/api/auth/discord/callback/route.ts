import { type NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'
import { distributeReferralRewards } from "@/lib/referrals/system"

// GET - Handle Discord OAuth callback (Production version)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log("[Discord Callback] Processing callback with state:", state?.slice(0, 10) + "...")

    if (error) {
      console.error('[Discord Callback] OAuth error:', error)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=discord_oauth_${error}`)
    }

    if (!code || !state) {
      console.error('[Discord Callback] Missing code or state')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=invalid_discord_callback`)
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

    // Verify OAuth state from database
    const { data: oauthState, error: stateError } = await supabase
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .eq("platform", "discord")
      .gt("expires_at", new Date().toISOString())
      .single()

    if (stateError || !oauthState) {
      console.error('[Discord Callback] Invalid or expired OAuth state:', stateError?.message)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=invalid_oauth_state`)
    }

    console.log("[Discord Callback] Valid OAuth state found for user:", oauthState.user_id)

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/discord/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[Discord Callback] Token exchange failed:', errorText)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=discord_token_failed`)
    }

    const tokenData = await tokenResponse.json()

    // Get Discord user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error('[Discord Callback] User info fetch failed:', await userResponse.text())
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=discord_user_failed`)
    }

    const discordUser = await userResponse.json()
    console.log("[Discord Callback] Got Discord user:", discordUser.username, "ID:", discordUser.id)

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', oauthState.user_id)
      .single()

    if (userError || !user) {
      console.error('[Discord Callback] User not found:', oauthState.user_id)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=user_not_found`)
    }

    // Check if Discord username is already taken by another user
    const { data: existingDiscord } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('discord_username', discordUser.username)
      .neq('id', user.id)
      .single()

    if (existingDiscord) {
      console.error('[Discord Callback] Username already linked to another account')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=discord_already_linked`)
    }

    // Check if user already has Discord connected
    if (user.discord_username) {
      console.error('[Discord Callback] User already has Discord connected:', user.discord_username)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=discord_already_connected`)
    }

    // Update user with Discord info
    const { error: updateError } = await supabase
      .from('users')
      .update({
        discord_username: discordUser.username,
        discord_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Discord Callback] Failed to update user:', updateError)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=update_failed`)
    }

    // Award points for Discord connection (100 points + 1 KCODE)
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
        type: "discord_connection",
        description: "Discord account connected",
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
            activity: 'discord_connection'
          })
        })

        if (mintResponse.ok) {
          const mintResult = await mintResponse.json()
          tokensMinted = mintResult.tokensAwarded || 0
          console.log("[Discord Callback] Tokens minted:", tokensMinted, "KCODE")
          
          // Create a points transaction for the KCODE tokens
          if (tokensMinted > 0) {
            // Store KCODE as points equivalent (1 KCODE = 100 points)
            const kcodePointsEquivalent = tokensMinted * 100
            await supabase.from("points_transactions").insert({
              user_id: user.id,
              amount: kcodePointsEquivalent,
              type: "kcode_reward",
              description: `${tokensMinted} KCODE tokens minted for Discord connection (${kcodePointsEquivalent} points equivalent)`,
            })
            console.log("[Discord Callback] KCODE points transaction created")
          }
        } else {
          const errorText = await mintResponse.text()
          console.error("[Discord Callback] Token minting failed:", errorText)
        }
      } catch (mintError) {
        console.error("[Discord Callback] Token minting failed:", mintError)
      }

      // Distribute referral rewards
      try {
        await distributeReferralRewards(user.id, connectionPoints, "discord_connection")
      } catch (referralError) {
        console.error("[Discord Callback] Referral rewards failed:", referralError)
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

    console.log("[Discord Callback] Successfully connected Discord @" + discordUser.username + " to user:", user.id)

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?success=discord_connected&username=${encodeURIComponent(discordUser.username)}`)

  } catch (error) {
    console.error("[API] Error in Discord callback:", error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=discord_callback_failed`)
  }
}