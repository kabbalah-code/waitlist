import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || ""
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || ""
const TWITTER_REDIRECT_URI = process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI || ""

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // Check for errors
  if (error) {
    return NextResponse.redirect(new URL("/dashboard?error=twitter_denied", request.url))
  }

  // Verify state
  const storedState = request.cookies.get("twitter_state")?.value
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_state", request.url))
  }

  // Get code verifier
  const codeVerifier = request.cookies.get("twitter_code_verifier")?.value
  if (!code || !codeVerifier) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_params", request.url))
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: TWITTER_CLIENT_ID,
        redirect_uri: TWITTER_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange token")
    }

    const tokens = await tokenResponse.json()

    // Get user info
    const userResponse = await fetch("https://api.twitter.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error("Failed to get user info")
    }

    const userData = await userResponse.json()
    const twitterUser = userData.data

    // Update user in database
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Update user with Twitter info
      await supabase
        .from("users")
        .update({
          twitter_username: twitterUser.username,
          twitter_id: twitterUser.id,
          twitter_connected_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      // Award achievement for connecting Twitter
      const { data: achievement } = await supabase
        .from("achievements")
        .select("id, points_reward")
        .eq("code", "social_butterfly")
        .single()

      if (achievement) {
        // Check if already earned
        const { data: existing } = await supabase
          .from("user_achievements")
          .select("id")
          .eq("user_id", user.id)
          .eq("achievement_id", achievement.id)
          .single()

        if (!existing) {
          await supabase.from("user_achievements").insert({
            user_id: user.id,
            achievement_id: achievement.id,
          })

          // Add points
          await supabase.from("points_transactions").insert({
            user_id: user.id,
            amount: achievement.points_reward,
            type: "achievement",
            description: "Connected Twitter account",
          })

          // Update total points
          await supabase.rpc("increment_points", {
            user_id: user.id,
            points_amount: achievement.points_reward,
          })
        }
      }
    }

    // Store Twitter username in localStorage via redirect
    const response = NextResponse.redirect(new URL(`/dashboard?twitter=${twitterUser.username}`, request.url))

    // Clear OAuth cookies
    response.cookies.delete("twitter_code_verifier")
    response.cookies.delete("twitter_state")

    return response
  } catch (err) {
    console.error("Twitter OAuth error:", err)
    return NextResponse.redirect(new URL("/dashboard?error=twitter_failed", request.url))
  }
}
