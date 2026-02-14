/**
 * 🛡️ INPUT VALIDATION & SANITIZATION
 * Prevents injection attacks and validates user input
 */

import { z } from 'zod'

// Ethereum address validation
export const ethereumAddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format')
  .transform(addr => addr.toLowerCase())

// Tweet URL validation - более строгая проверка
export const tweetUrlSchema = z.string()
  .min(1, 'Tweet URL is required')
  .url('Invalid URL format')
  .refine(
    (url) => {
      // Проверяем что это Twitter/X URL
      const twitterRegex = /^https:\/\/(twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/
      return twitterRegex.test(url)
    },
    {
      message: 'Please provide a valid Twitter/X URL (e.g., https://twitter.com/username/status/123456789)'
    }
  )

// Telegram username validation
export const telegramUsernameSchema = z.string()
  .min(5, 'Telegram username too short')
  .max(32, 'Telegram username too long')
  .regex(/^[a-zA-Z0-9_]+$/, 'Invalid Telegram username format')

// Discord username validation
export const discordUsernameSchema = z.string()
  .min(2, 'Discord username too short')
  .max(32, 'Discord username too long')
  .regex(/^[a-zA-Z0-9._]+$/, 'Invalid Discord username format')

// Task ID validation
export const taskIdSchema = z.string()
  .regex(/^\d+$/, 'Invalid task ID format')
  .transform(id => parseInt(id))

// User ID validation (UUID)
export const userIdSchema = z.string()
  .uuid('Invalid user ID format')

// Wallet signature validation
export const signatureSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature format')

/**
 * Validate and sanitize task verification request
 */
export interface TaskVerificationRequest {
  taskId: number
  taskType: string
  walletAddress: string
  userId: string
  tweetUrl?: string
  signature?: string
  message?: string
}

export const taskVerificationSchema = z.object({
  taskId: taskIdSchema,
  taskType: z.enum([
    'twitter_follow',
    'twitter_engagement',
    'telegram',
    'telegram_channel',
    'telegram_chat',
    'discord'
  ]),
  walletAddress: ethereumAddressSchema,
  userId: userIdSchema,
  tweetUrl: z.string().optional(), // Будет проверяться в API
  signature: signatureSchema.optional(),
  message: z.string().max(1000).optional()
}).refine(
  (data) => {
    // Для twitter_engagement tweetUrl обязателен (URL комментария)
    if (data.taskType === 'twitter_engagement') {
      return !!data.tweetUrl && data.tweetUrl.length > 0
    }
    return true
  },
  {
    message: 'Comment URL is required for Twitter engagement tasks',
    path: ['tweetUrl']
  }
)

/**
 * Validate ritual verification request
 */
export interface RitualVerificationRequest {
  walletAddress: string
  userId: string
  tweetUrl: string
  signature?: string
  message?: string
}

export const ritualVerificationSchema = z.object({
  walletAddress: ethereumAddressSchema,
  userId: userIdSchema,
  tweetUrl: tweetUrlSchema,
  signature: signatureSchema.optional(),
  message: z.string().max(1000).optional()
})

/**
 * Validate social connection request
 */
export interface SocialConnectionRequest {
  walletAddress: string
  userId: string
  platform: 'twitter' | 'telegram' | 'discord'
  username: string
  signature?: string
  message?: string
}

export const socialConnectionSchema = z.object({
  walletAddress: ethereumAddressSchema,
  userId: userIdSchema,
  platform: z.enum(['twitter', 'telegram', 'discord']),
  username: z.string().min(1).max(50),
  signature: signatureSchema.optional(),
  message: z.string().max(1000).optional()
})

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate and extract tweet ID from URL
 */
export function extractTweetId(tweetUrl: string): string | null {
  try {
    const validated = tweetUrlSchema.parse(tweetUrl)
    const match = validated.match(/status\/(\d+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * Validate and extract Twitter username from URL
 */
export function extractTwitterUsername(tweetUrl: string): string | null {
  try {
    const validated = tweetUrlSchema.parse(tweetUrl)
    const match = validated.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\//)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * Rate limit key validation
 */
export function validateRateLimitKey(key: string): boolean {
  // Prevent key injection attacks
  return /^[a-zA-Z0-9:._-]+$/.test(key) && key.length < 100
}

/**
 * SQL injection prevention for search queries
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/['"\\;]/g, '') // Remove dangerous characters
    .trim()
    .slice(0, 100) // Limit length
}

/**
 * Validate IP address format
 */
export function validateIpAddress(ip: string): boolean {
  // Allow 'unknown' for cases where IP can't be determined
  if (ip === 'unknown') return true
  
  // IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4Regex.test(ip)) {
    // Additional check: each octet should be 0-255
    const octets = ip.split('.')
    return octets.every(octet => {
      const num = parseInt(octet, 10)
      return num >= 0 && num <= 255
    })
  }
  
  // IPv6 validation (including compressed forms like ::1)
  // Simplified regex that accepts most valid IPv6 formats
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::)$/
  
  return ipv6Regex.test(ip)
}

/**
 * Validate user agent string
 */
export function validateUserAgent(userAgent: string): boolean {
  // Basic validation - not empty, reasonable length, no suspicious patterns
  return userAgent.length > 10 && 
         userAgent.length < 500 && 
         !/[<>'"\\]/.test(userAgent)
}