/**
 * Rate limiting utilities for anti-abuse measures
 */

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number // milliseconds until reset
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number // time window in milliseconds
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configurations
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  DAILY_RITUAL: {
    maxRequests: 3, // 3 attempts per day
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  WHEEL_SPIN: {
    maxRequests: 10, // 10 spins per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  TASK_COMPLETION: {
    maxRequests: 20, // 20 task completions per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  API_GENERAL: {
    maxRequests: 100, // 100 requests per 15 minutes
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  TWITTER_VERIFY: {
    maxRequests: 5, // 5 verification attempts per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  },
}

/**
 * Check if a request is within rate limits
 */
export function checkRateLimit(identifier: string, type: keyof typeof RATE_LIMITS): RateLimitResult {
  const config = RATE_LIMITS[type]
  if (!config) {
    // If no config found, allow the request
    return {
      allowed: true,
      remaining: 999,
      resetIn: 0,
    }
  }

  const key = `${type}:${identifier}`
  const now = Date.now()
  const existing = rateLimitStore.get(key)

  // If no existing record or window has expired, create new record
  if (!existing || now >= existing.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    }
  }

  // Check if limit exceeded
  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: existing.resetTime - now,
    }
  }

  // Increment count
  existing.count++
  rateLimitStore.set(key, existing)

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetIn: existing.resetTime - now,
  }
}

/**
 * Reset rate limit for a specific identifier and type
 */
export function resetRateLimit(identifier: string, type: keyof typeof RATE_LIMITS): void {
  const key = `${type}:${identifier}`
  rateLimitStore.delete(key)
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(identifier: string, type: keyof typeof RATE_LIMITS): RateLimitResult {
  const config = RATE_LIMITS[type]
  if (!config) {
    return {
      allowed: true,
      remaining: 999,
      resetIn: 0,
    }
  }

  const key = `${type}:${identifier}`
  const now = Date.now()
  const existing = rateLimitStore.get(key)

  if (!existing || now >= existing.resetTime) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetIn: 0,
    }
  }

  return {
    allowed: existing.count < config.maxRequests,
    remaining: Math.max(0, config.maxRequests - existing.count),
    resetIn: existing.resetTime - now,
  }
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupExpiredRateLimits(): void {
  const now = Date.now()
  
  for (const [key, value] of rateLimitStore.entries()) {
    if (now >= value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRateLimits, 5 * 60 * 1000)
}