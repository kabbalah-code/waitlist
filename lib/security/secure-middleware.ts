/**
 * 🔒 SECURE MIDDLEWARE SYSTEM
 * Comprehensive security checks for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, taskVerificationLimiter, ritualLimiter, generalApiLimiter } from './rate-limiter'
import { verifyWalletSignature, verifySessionToken, validateChallengeMessage } from './wallet-verification'
import { validateIpAddress, validateUserAgent } from './input-validation'
import { createAdminClient } from '@/lib/supabase/admin'

interface SecurityCheckResult {
  allowed: boolean
  error?: string
  headers?: Record<string, string>
  userId?: string
  walletAddress?: string
}

/**
 * Comprehensive security middleware
 */
export async function secureMiddleware(
  request: NextRequest,
  options: {
    requireAuth?: boolean
    requireSignature?: boolean
    rateLimiter?: 'task' | 'ritual' | 'general'
    allowedMethods?: string[]
  } = {}
): Promise<SecurityCheckResult> {
  const {
    requireAuth = true,
    requireSignature = false,
    rateLimiter = 'general',
    allowedMethods = ['POST', 'GET']
  } = options

  try {
    // 1. Method validation
    if (!allowedMethods.includes(request.method)) {
      return {
        allowed: false,
        error: `Method ${request.method} not allowed`
      }
    }

    // 2. Rate limiting
    const limiter = rateLimiter === 'task' ? taskVerificationLimiter :
                   rateLimiter === 'ritual' ? ritualLimiter :
                   generalApiLimiter

    const rateLimitResult = await checkRateLimit(request, limiter, rateLimiter)
    if (!rateLimitResult.allowed) {
      return {
        allowed: false,
        error: 'Rate limit exceeded',
        headers: rateLimitResult.headers
      }
    }

    // 3. Basic request validation
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
              request.headers.get('x-real-ip') ||
              'unknown'
    
    const userAgent = request.headers.get('user-agent') || ''

    if (ip !== 'unknown' && !validateIpAddress(ip)) {
      return {
        allowed: false,
        error: 'Invalid IP address format'
      }
    }

    if (!validateUserAgent(userAgent)) {
      return {
        allowed: false,
        error: 'Invalid user agent'
      }
    }

    // 4. Authentication check
    if (requireAuth) {
      const authResult = await checkAuthentication(request, requireSignature)
      if (!authResult.allowed) {
        return authResult
      }

      return {
        allowed: true,
        headers: rateLimitResult.headers,
        userId: authResult.userId,
        walletAddress: authResult.walletAddress
      }
    }

    return {
      allowed: true,
      headers: rateLimitResult.headers
    }

  } catch (error) {
    console.error('[SecureMiddleware] Error:', error)
    return {
      allowed: false,
      error: 'Security check failed'
    }
  }
}

/**
 * Authentication verification
 */
async function checkAuthentication(
  request: NextRequest,
  requireSignature: boolean = false
): Promise<SecurityCheckResult> {
  try {
    console.log('[Authentication] 🔍 Starting authentication check')
    
    let walletAddress: string | null = null
    let userId: string | null = null
    let signature: string | undefined
    let message: string | undefined

    // Try to get auth data from body first
    try {
      const bodyText = await request.clone().text()
      console.log('[Authentication] 📥 Body text length:', bodyText.length)
      
      if (bodyText) {
        const body = JSON.parse(bodyText)
        console.log('[Authentication] 📦 Parsed body keys:', Object.keys(body))
        walletAddress = body.walletAddress
        userId = body.userId
        signature = body.signature
        message = body.message
        console.log('[Authentication] 📦 From body:', {
          hasWallet: !!walletAddress,
          hasUserId: !!userId,
          wallet: walletAddress?.slice(0, 10) + '...',
          userId: userId?.slice(0, 8) + '...'
        })
      }
    } catch (e) {
      // Body parsing failed, will try headers
      console.log('[Authentication] ⚠️ Body parsing failed:', e)
    }

    // Fallback: try headers (for compatibility)
    if (!walletAddress || !userId) {
      walletAddress = request.headers.get('x-wallet-address') || walletAddress
      userId = request.headers.get('x-user-id') || request.headers.get('x-user-id-storage') || userId
    }

    // Basic field validation
    if (!walletAddress || !userId) {
      console.log('[Authentication] Missing fields:', { 
        hasWallet: !!walletAddress, 
        hasUserId: !!userId,
        bodyParsed: !!walletAddress && !!userId,
        headers: {
          wallet: request.headers.get('x-wallet-address'),
          userId: request.headers.get('x-user-id'),
          userIdStorage: request.headers.get('x-user-id-storage')
        }
      })
      return {
        allowed: false,
        error: 'Missing required authentication fields (walletAddress, userId)'
      }
    }

    console.log('[Authentication] ✅ Auth data found:', {
      wallet: walletAddress.slice(0, 10) + '...',
      userId: userId.slice(0, 8) + '...'
    })

    // Signature verification (if required)
    if (requireSignature) {
      if (!signature || !message) {
        return {
          allowed: false,
          error: 'Signature verification required'
        }
      }

      // Validate challenge message
      const messageValidation = validateChallengeMessage(message)
      if (!messageValidation.valid) {
        return {
          allowed: false,
          error: messageValidation.error
        }
      }

      // Verify signature
      const signatureResult = await verifyWalletSignature(walletAddress, message, signature)
      if (!signatureResult.valid) {
        return {
          allowed: false,
          error: signatureResult.error
        }
      }
    }

    // Database verification
    const dbResult = await verifyUserInDatabase(userId, walletAddress)
    if (!dbResult.allowed) {
      return dbResult
    }

    return {
      allowed: true,
      userId,
      walletAddress
    }

  } catch (error) {
    console.error('[Authentication] Error:', error)
    return {
      allowed: false,
      error: 'Authentication failed'
    }
  }
}

/**
 * Verify user exists in database and wallet matches
 */
async function verifyUserInDatabase(
  userId: string,
  walletAddress: string
): Promise<SecurityCheckResult> {
  try {
    const supabase = createAdminClient()
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return {
        allowed: false,
        error: 'User not found'
      }
    }

    if (user.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      return {
        allowed: false,
        error: 'Wallet address mismatch'
      }
    }

    return {
      allowed: true,
      userId,
      walletAddress: user.wallet_address
    }

  } catch (error) {
    console.error('[DatabaseVerification] Error:', error)
    return {
      allowed: false,
      error: 'Database verification failed'
    }
  }
}

/**
 * Create secure response with security headers
 */
export function createSecureResponse(
  data: any,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  const response = NextResponse.json(data, { status })

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  // Add additional headers
  Object.entries(additionalHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

/**
 * Helper to extract and validate request data
 */
export async function extractRequestData<T>(
  request: NextRequest,
  schema: any
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const body = await request.json()
    const validatedData = schema.parse(body)
    
    return {
      success: true,
      data: validatedData
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request data'
    }
  }
}