import { createClient } from '@/lib/supabase/server'

interface AdminRateLimitResult {
  allowed: boolean
  reason?: string
  retryAfter?: number
}

/**
 * Check rate limit for admin endpoints
 * Max 10 requests per minute per IP
 */
export async function checkAdminRateLimit(
  ip: string,
  endpoint: string
): Promise<AdminRateLimitResult> {
  try {
    const supabase = await createClient()
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60000)
    
    // Max 10 requests per minute for admin endpoints
    const { count, error } = await supabase
      .from('admin_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('endpoint', endpoint)
      .gte('created_at', oneMinuteAgo.toISOString())
    
    if (error) {
      console.error('Admin rate limit check error:', error)
      // Fail open in case of database error
      return { allowed: true }
    }
    
    if (count && count >= 10) {
      return {
        allowed: false,
        reason: 'Too many admin requests. Please try again later.',
        retryAfter: 60
      }
    }
    
    // Log request
    await supabase.from('admin_rate_limits').insert({
      ip_address: ip,
      endpoint,
      created_at: now.toISOString()
    })
    
    return { allowed: true }
  } catch (error) {
    console.error('Admin rate limit check fatal error:', error)
    // Fail open in case of system error
    return { allowed: true }
  }
}

/**
 * Check if IP has suspicious admin access patterns
 */
export async function checkSuspiciousAdminActivity(ip: string): Promise<{
  isSuspicious: boolean
  failedAttempts: number
}> {
  try {
    const supabase = await createClient()
    const oneHourAgo = new Date(Date.now() - 3600000)
    
    // Check failed admin attempts in last hour
    const { count, error } = await supabase
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('type', 'unauthorized_admin_access')
      .gte('timestamp', oneHourAgo.toISOString())
    
    if (error) {
      console.error('Suspicious activity check error:', error)
      return { isSuspicious: false, failedAttempts: 0 }
    }
    
    const failedAttempts = count || 0
    
    // More than 5 failed attempts in an hour is suspicious
    return {
      isSuspicious: failedAttempts > 5,
      failedAttempts
    }
  } catch (error) {
    console.error('Suspicious activity check fatal error:', error)
    return { isSuspicious: false, failedAttempts: 0 }
  }
}
