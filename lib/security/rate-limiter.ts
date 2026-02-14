/**
 * 🚦 RATE LIMITING SYSTEM
 * Prevents API abuse and automated attacks
 */

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyGenerator?: (req: any) => string // Custom key generator
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000)
  }

  async isAllowed(key: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const resetTime = now + this.config.windowMs
      this.store.set(key, { count: 1, resetTime })
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime
      }
    }

    if (entry.count >= this.config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      }
    }

    // Increment counter
    entry.count++
    this.store.set(key, entry)

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

// Pre-configured rate limiters
export const taskVerificationLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10 // Max 10 task verifications per minute
})

export const ritualLimiter = new RateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 3 // Max 3 ritual attempts per day
})

export const generalApiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100 // Max 100 API calls per minute
})

export const socialConnectLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5 // Max 5 social connections per hour
})

/**
 * Generate rate limit key from request
 */
export function getRateLimitKey(req: any, prefix: string = 'api'): string {
  // Try multiple sources for IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
            req.headers.get('x-real-ip') ||
            req.ip ||
            'unknown'
  
  // Include user agent for additional uniqueness
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const userAgentHash = Buffer.from(userAgent).toString('base64').slice(0, 8)
  
  return `${prefix}:${ip}:${userAgentHash}`
}

/**
 * Middleware helper for rate limiting
 */
export async function checkRateLimit(
  req: any,
  limiter: RateLimiter,
  keyPrefix: string = 'api'
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const key = getRateLimitKey(req, keyPrefix)
  const result = await limiter.isAllowed(key)
  
  const headers = {
    'X-RateLimit-Limit': limiter['config'].maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
  }

  if (!result.allowed) {
    headers['Retry-After'] = Math.ceil((result.resetTime - Date.now()) / 1000).toString()
  }

  return { allowed: result.allowed, headers }
}