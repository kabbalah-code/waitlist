import { NextResponse } from "next/server"
import crypto from "crypto"

// Twitter OAuth 2.0 configuration
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || ""
const TWITTER_REDIRECT_URI = process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI || ""

export async function GET() {
  // Generate PKCE code verifier and challenge
  const codeVerifier = crypto.randomBytes(32).toString("base64url")
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url")

  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString("hex")

  // Build authorization URL
  const authUrl = new URL("https://twitter.com/i/oauth2/authorize")
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("client_id", TWITTER_CLIENT_ID)
  authUrl.searchParams.set("redirect_uri", TWITTER_REDIRECT_URI)
  authUrl.searchParams.set("scope", "tweet.read users.read offline.access")
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("code_challenge", codeChallenge)
  authUrl.searchParams.set("code_challenge_method", "S256")

  // Create response with cookies for verification
  const response = NextResponse.json({
    authUrl: authUrl.toString(),
    state,
  })

  // Store code verifier in cookie (httpOnly for security)
  response.cookies.set("twitter_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
  })

  response.cookies.set("twitter_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
  })

  return response
}
