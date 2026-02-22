import { createAdminClient } from '@/lib/supabase/admin'

export type SecurityEventType = 
  | 'unauthorized_access'
  | 'rate_limit_exceeded'
  | 'invalid_token'
  | 'admin_access_attempt'
  | 'unauthorized_admin_access'
  | 'suspicious_activity'
  | 'xss_attempt'
  | 'sql_injection_attempt'
  | 'csrf_attempt'
  | 'brute_force_attempt'

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SecurityEvent {
  type: SecurityEventType
  severity: SecuritySeverity
  ip: string
  userAgent?: string
  userId?: string
  wallet?: string
  endpoint: string
  details?: any
}

/**
 * Log security event to database
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const supabase = createAdminClient()
    
    await supabase.from('security_events').insert({
      type: event.type,
      severity: event.severity,
      ip_address: event.ip,
      user_agent: event.userAgent,
      user_id: event.userId,
      wallet_address: event.wallet,
      endpoint: event.endpoint,
      details: event.details,
      timestamp: new Date().toISOString()
    })
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SECURITY]', {
        ...event,
        timestamp: new Date().toISOString()
      })
    }
    
    // Send alert for critical events
    if (event.severity === 'critical') {
      await sendSecurityAlert(event)
    }
  } catch (error) {
    console.error('Failed to log security event:', error)
    // Don't throw - logging should never break the app
  }
}

/**
 * Send security alert for critical events
 */
async function sendSecurityAlert(event: SecurityEvent): Promise<void> {
  try {
    // Log critical event to console
    console.error('[CRITICAL SECURITY EVENT]', {
      ...event,
      timestamp: new Date().toISOString()
    })
    
    // TODO: Implement alerting system
    // - Send to Telegram bot
    // - Send to Discord webhook
    // - Send email to security team
    // - Trigger PagerDuty/OpsGenie
    
  } catch (error) {
    console.error('Failed to send security alert:', error)
  }
}

/**
 * Get recent security events for analysis
 */
export async function getRecentSecurityEvents(
  limit: number = 100,
  severity?: SecuritySeverity
): Promise<any[]> {
  try {
    const supabase = createAdminClient()
    
    let query = supabase
      .from('security_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (severity) {
      query = query.eq('severity', severity)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Failed to get security events:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Failed to get security events:', error)
    return []
  }
}

/**
 * Get security events by IP address
 */
export async function getSecurityEventsByIP(
  ip: string,
  hoursAgo: number = 24
): Promise<any[]> {
  try {
    const supabase = createAdminClient()
    const since = new Date(Date.now() - hoursAgo * 3600000)
    
    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .eq('ip_address', ip)
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false })
    
    if (error) {
      console.error('Failed to get security events by IP:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Failed to get security events by IP:', error)
    return []
  }
}
