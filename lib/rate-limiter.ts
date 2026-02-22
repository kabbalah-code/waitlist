import { createClient } from '@/lib/supabase/server';

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number; // seconds
}

export async function checkRateLimit(
  ip: string,
  fingerprint?: string,
  email?: string
): Promise<RateLimitResult> {
  try {
    const supabase = await createClient();
    const now = new Date();
    
    // 1. Проверка IP (max 3 регистрации в час)
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const { count: ipCount, error: ipError } = await supabase
      .from('waitlist_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', oneHourAgo.toISOString());
    
    if (ipError) {
      console.error('Rate limit check error (IP):', ipError);
      // Fail open: allow registration if database is unavailable
      return { allowed: true };
    }
    
    if (ipCount && ipCount >= 3) {
      return {
        allowed: false,
        reason: 'Too many registrations from this IP address. Please try again later.',
        retryAfter: 3600
      };
    }
    
    // 2. Проверка fingerprint (max 1 регистрация в день)
    if (fingerprint && fingerprint !== 'unknown') {
      const oneDayAgo = new Date(now.getTime() - 86400000);
      const { count: fpCount, error: fpError } = await supabase
        .from('waitlist_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('browser_fingerprint', fingerprint)
        .gte('created_at', oneDayAgo.toISOString());
      
      if (fpError) {
        console.error('Rate limit check error (fingerprint):', fpError);
        return { allowed: true };
      }
      
      if (fpCount && fpCount >= 1) {
        return {
          allowed: false,
          reason: 'You have already registered. Please check your email.',
          retryAfter: 86400
        };
      }
    }
    
    // 3. Проверка email domain (max 5 регистраций в час с одного домена)
    if (email) {
      const domain = email.split('@')[1];
      if (domain) {
        const { count: domainCount, error: domainError } = await supabase
          .from('waitlist_registrations')
          .select('email', { count: 'exact', head: true })
          .ilike('email', `%@${domain}`)
          .gte('created_at', oneHourAgo.toISOString());
        
        if (domainError) {
          console.error('Rate limit check error (domain):', domainError);
          return { allowed: true };
        }
        
        if (domainCount && domainCount >= 5) {
          return {
            allowed: false,
            reason: 'Too many registrations from this email domain.',
            retryAfter: 3600
          };
        }
      }
    }
    
    // 4. Глобальная проверка (max 100 регистраций в минуту)
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const { count: globalCount, error: globalError } = await supabase
      .from('waitlist_registrations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneMinuteAgo.toISOString());
    
    if (globalError) {
      console.error('Rate limit check error (global):', globalError);
      return { allowed: true };
    }
    
    if (globalCount && globalCount >= 100) {
      return {
        allowed: false,
        reason: 'System is experiencing high traffic. Please try again in a moment.',
        retryAfter: 60
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check fatal error:', error);
    // Fail open: allow registration if there's a system error
    return { allowed: true };
  }
}

// Проверка velocity (скорость регистраций)
export async function checkVelocity(ip: string): Promise<{
  isBot: boolean;
  registrationsPerMinute: number;
}> {
  try {
    const supabase = await createClient();
    const fiveMinutesAgo = new Date(Date.now() - 300000);
    
    const { data: recentRegistrations, error } = await supabase
      .from('waitlist_registrations')
      .select('created_at')
      .eq('ip_address', ip)
      .gte('created_at', fiveMinutesAgo.toISOString())
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Velocity check error:', error);
      return { isBot: false, registrationsPerMinute: 0 };
    }
    
    if (!recentRegistrations || recentRegistrations.length < 2) {
      return { isBot: false, registrationsPerMinute: 0 };
    }
    
    // Рассчитать среднее время между регистрациями
    const intervals: number[] = [];
    for (let i = 1; i < recentRegistrations.length; i++) {
      const prev = new Date(recentRegistrations[i - 1].created_at).getTime();
      const curr = new Date(recentRegistrations[i].created_at).getTime();
      intervals.push(curr - prev);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const registrationsPerMinute = 60000 / avgInterval;
    
    // Если больше 10 регистраций в минуту - вероятно бот
    return {
      isBot: registrationsPerMinute > 10,
      registrationsPerMinute
    };
  } catch (error) {
    console.error('Velocity check fatal error:', error);
    return { isBot: false, registrationsPerMinute: 0 };
  }
}
