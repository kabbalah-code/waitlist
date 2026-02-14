import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyWalletSignature, generateChallengeMessage, createSessionToken } from "@/lib/security/wallet-verification"
import { createSecureResponse } from "@/lib/security/secure-middleware"
import { ethereumAddressSchema, signatureSchema } from "@/lib/security/input-validation"
import { calculateWalletNumber } from "@/lib/web3/ethereum"
import { z } from "zod"

// Generate nonce for wallet authentication
export async function GET(request: NextRequest) {
  try {
    console.log("[WalletAuth] GET - Generating nonce")
    
    // Generate a secure nonce
    const nonce = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15)
    
    console.log("[WalletAuth] Generated nonce:", nonce.slice(0, 8) + "...")
    
    return createSecureResponse({
      success: true,
      nonce
    })
    
  } catch (error) {
    console.error("[WalletAuth] GET error:", error)
    return createSecureResponse({
      success: false,
      error: "Failed to generate nonce"
    }, 500)
  }
}

// Wallet authentication schema
const walletAuthSchema = z.object({
  walletAddress: ethereumAddressSchema,
  signature: signatureSchema,
  nonce: z.string().min(10).max(50),
  referralCode: z.string().optional()
})

// Authenticate wallet with signature
export async function POST(request: NextRequest) {
  try {
    console.log("[WalletAuth] POST - Wallet authentication")
    
    // Parse and validate request body
    const body = await request.json()
    const { walletAddress, signature, nonce, referralCode } = walletAuthSchema.parse(body)
    
    console.log("[WalletAuth] Authentication request:", {
      wallet: walletAddress.slice(0, 10) + "...",
      hasSignature: !!signature,
      hasNonce: !!nonce,
      hasReferral: !!referralCode
    })
    
    // Create the message that should have been signed
    const message = `Welcome to Kabbalah Code Game!

Click "Sign" to authenticate your wallet.

Wallet: ${walletAddress}
Nonce: ${nonce}

This request will not trigger a blockchain transaction or cost any gas fees.`
    
    // Verify the signature
    const signatureResult = await verifyWalletSignature(walletAddress, message, signature)
    if (!signatureResult.valid) {
      console.log("[WalletAuth] ❌ Invalid signature:", signatureResult.error)
      return createSecureResponse({
        success: false,
        error: signatureResult.error || "Invalid signature"
      }, 401)
    }
    
    console.log("[WalletAuth] ✅ Signature verified")
    
    // Create Supabase admin client
    const supabase = createAdminClient()
    
    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single()
    
    let user = existingUser
    
    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new user
      console.log("[WalletAuth] Creating new user for wallet:", walletAddress.slice(0, 10) + "...")
      
      // Calculate wallet number
      const walletNumber = calculateWalletNumber(walletAddress)
      
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          wallet_address: walletAddress,
          wallet_number: walletNumber,
          total_kcode: 0, // Starting with 0 KCODE
          tokens_minted: 0,
          current_streak: 0,
          longest_streak: 0,
          free_spins: 1, // Starting free spin
          referral_code: walletAddress.slice(2, 10).toUpperCase(),
          referred_by: referralCode || null
        })
        .select()
        .single()
      
      if (createError) {
        console.error("[WalletAuth] Failed to create user:", createError)
        return createSecureResponse({
          success: false,
          error: "Failed to create user account"
        }, 500)
      }
      
      user = newUser
      console.log("[WalletAuth] ✅ New user created:", user.id)
      
      // Award referral bonus if applicable
      if (referralCode) {
        try {
          const { data: referrer } = await supabase
            .from("users")
            .select("id, wallet_address, total_kcode, tokens_minted")
            .eq("referral_code", referralCode.toUpperCase())
            .single()
          
          if (referrer) {
            // Award referral bonus via smart contract (10 KCODE to both)
            const { rewardUserWithKcode } = await import("@/lib/web3/backend-contracts")
            
            try {
              // Reward referrer
              await rewardUserWithKcode(referrer.wallet_address, 10, "Referral Bonus")
              
              // Reward new user
              await rewardUserWithKcode(walletAddress, 10, "Welcome Bonus")
              
              console.log("[WalletAuth] ✅ Referral bonus awarded via smart contract")
            } catch (contractError) {
              console.error("[WalletAuth] Smart contract reward failed:", contractError)
              // Continue without failing authentication
            }
          }
        } catch (referralError) {
          console.error("[WalletAuth] Referral bonus error:", referralError)
          // Don't fail the authentication for referral errors
        }
      }
      
    } else if (userError) {
      console.error("[WalletAuth] Database error:", userError)
      return createSecureResponse({
        success: false,
        error: "Database error"
      }, 500)
    } else {
      console.log("[WalletAuth] ✅ Existing user found:", user.id)
    }
    
    // Create session token
    const sessionToken = createSessionToken(walletAddress)
    
    // Log the authentication event
    try {
      await supabase
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          wallet_address: walletAddress,
          event_type: 'wallet_authentication',
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          risk_score: 0,
          blocked: false,
          metadata: {
            nonce,
            referralCode,
            signatureVerified: true
          }
        })
    } catch (logError) {
      console.error("[WalletAuth] Failed to log authentication:", logError)
      // Don't fail authentication for logging errors
    }
    
    console.log("[WalletAuth] ✅ Authentication successful")
    
    return createSecureResponse({
      success: true,
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        wallet_number: user.wallet_number,
        total_kcode: user.total_kcode || 0,
        tokens_minted: user.tokens_minted || 0,
        current_streak: user.current_streak,
        free_spins: user.free_spins,
        twitter_username: user.twitter_username,
        telegram_username: user.telegram_username,
        discord_username: user.discord_username
      },
      session: {
        token: sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    })
    
  } catch (error) {
    console.error("[WalletAuth] POST error:", error)
    
    if (error instanceof z.ZodError) {
      return createSecureResponse({
        success: false,
        error: "Invalid request data: " + error.errors.map(e => e.message).join(", ")
      }, 400)
    }
    
    // Check for Supabase configuration errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('supabase') || errorMessage.includes('Invalid URL')) {
      return createSecureResponse({
        success: false,
        error: "Database not configured. Please set up Supabase credentials in .env.local"
      }, 503)
    }
    
    return createSecureResponse({
      success: false,
      error: "Authentication failed"
    }, 500)
  }
}