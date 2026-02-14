/**
 * 🔐 WALLET SIGNATURE VERIFICATION
 * Ensures wallet ownership through cryptographic signatures
 */

import { ethers } from 'ethers'

interface SignatureVerificationResult {
  valid: boolean
  error?: string
  recoveredAddress?: string
}

/**
 * Verify wallet ownership through signature
 */
export async function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string
): Promise<SignatureVerificationResult> {
  try {
    // Normalize addresses
    const expectedAddress = ethers.getAddress(walletAddress.toLowerCase())
    
    // Recover address from signature
    const recoveredAddress = ethers.verifyMessage(message, signature)
    const normalizedRecovered = ethers.getAddress(recoveredAddress.toLowerCase())
    
    console.log('[WalletVerification] Signature check:', {
      expected: expectedAddress,
      recovered: normalizedRecovered,
      match: expectedAddress === normalizedRecovered
    })

    if (expectedAddress !== normalizedRecovered) {
      return {
        valid: false,
        error: 'Signature does not match wallet address',
        recoveredAddress: normalizedRecovered
      }
    }

    return {
      valid: true,
      recoveredAddress: normalizedRecovered
    }

  } catch (error) {
    console.error('[WalletVerification] Signature verification error:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid signature format'
    }
  }
}

/**
 * Generate challenge message for wallet verification
 */
export function generateChallengeMessage(
  walletAddress: string,
  timestamp: number = Date.now(),
  nonce?: string
): string {
  const challengeNonce = nonce || Math.random().toString(36).substring(2, 15)
  
  return `Verify wallet ownership for Kabbalah Code Game

Wallet: ${walletAddress}
Timestamp: ${timestamp}
Nonce: ${challengeNonce}

This signature proves you own this wallet address.`
}

/**
 * Validate challenge message format and timestamp
 */
export function validateChallengeMessage(
  message: string,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes
): { valid: boolean; error?: string; timestamp?: number; walletAddress?: string } {
  try {
    // Extract timestamp from message
    const timestampMatch = message.match(/Timestamp: (\d+)/)
    if (!timestampMatch) {
      return { valid: false, error: 'Invalid message format: missing timestamp' }
    }

    const timestamp = parseInt(timestampMatch[1])
    const now = Date.now()
    
    if (now - timestamp > maxAgeMs) {
      return { valid: false, error: 'Challenge message expired' }
    }

    // Extract wallet address
    const walletMatch = message.match(/Wallet: (0x[a-fA-F0-9]{40})/)
    if (!walletMatch) {
      return { valid: false, error: 'Invalid message format: missing wallet address' }
    }

    return {
      valid: true,
      timestamp,
      walletAddress: walletMatch[1]
    }

  } catch (error) {
    return {
      valid: false,
      error: 'Failed to parse challenge message'
    }
  }
}

/**
 * Create secure session token after wallet verification
 */
export function createSessionToken(
  walletAddress: string,
  timestamp: number = Date.now()
): string {
  const payload = {
    wallet: walletAddress.toLowerCase(),
    timestamp,
    nonce: Math.random().toString(36).substring(2, 15)
  }
  
  // In production, use proper JWT with secret key
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

/**
 * Verify session token
 */
export function verifySessionToken(
  token: string,
  expectedWallet: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours
): { valid: boolean; error?: string; wallet?: string } {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())
    
    if (!payload.wallet || !payload.timestamp) {
      return { valid: false, error: 'Invalid token format' }
    }

    if (payload.wallet.toLowerCase() !== expectedWallet.toLowerCase()) {
      return { valid: false, error: 'Token wallet mismatch' }
    }

    if (Date.now() - payload.timestamp > maxAgeMs) {
      return { valid: false, error: 'Token expired' }
    }

    return { valid: true, wallet: payload.wallet }

  } catch (error) {
    return { valid: false, error: 'Failed to parse token' }
  }
}