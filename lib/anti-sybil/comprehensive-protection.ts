/**
 * 🔒 КОМПЛЕКСНАЯ АНТИ-СИБИЛ ЗАЩИТА
 * Система защиты от множественных аккаунтов и злоупотреблений
 */

import { createClient } from '@supabase/supabase-js'

interface SybilCheckResult {
  allowed: boolean
  risk: 'low' | 'medium' | 'high' | 'critical'
  reasons: string[]
  score: number // 0-100, где 100 = максимальный риск
}

interface UserFingerprint {
  walletAddress: string
  ipAddress?: string
  userAgent?: string
  timezone?: string
  screenResolution?: string
  language?: string
  twitterUsername?: string
  telegramUsername?: string
  discordUsername?: string
}

/**
 * 🔍 ОСНОВНЫЕ ПРОВЕРКИ АНТИ-СИБИЛ
 */
export class AntiSybilProtection {
  private supabase: any

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }

  /**
   * Комплексная проверка пользователя на сибил-атаки
   */
  async checkUser(fingerprint: UserFingerprint): Promise<SybilCheckResult> {
    const checks = await Promise.all([
      this.checkWalletPatterns(fingerprint.walletAddress),
      this.checkSocialAccountReuse(fingerprint),
      this.checkBehaviorPatterns(fingerprint.walletAddress),
      this.checkIPClustering(fingerprint.ipAddress),
      this.checkDeviceFingerprinting(fingerprint),
      this.checkTemporalPatterns(fingerprint.walletAddress),
      this.checkTransactionPatterns(fingerprint.walletAddress)
    ])

    const reasons: string[] = []
    let totalScore = 0

    checks.forEach(check => {
      totalScore += check.score
      if (check.reasons.length > 0) {
        reasons.push(...check.reasons)
      }
    })

    // Нормализуем счет (0-100)
    const normalizedScore = Math.min(100, totalScore)
    
    let risk: SybilCheckResult['risk'] = 'low'
    if (normalizedScore >= 80) risk = 'critical'
    else if (normalizedScore >= 60) risk = 'high'
    else if (normalizedScore >= 40) risk = 'medium'

    return {
      allowed: normalizedScore < 70, // Блокируем при высоком риске
      risk,
      reasons,
      score: normalizedScore
    }
  }

  /**
   * 1️⃣ Проверка паттернов кошельков
   */
  private async checkWalletPatterns(walletAddress: string): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 0

    try {
      // Проверяем последовательные адреса (0x...001, 0x...002, etc.)
      const { data: sequentialWallets } = await this.supabase
        .from('users')
        .select('wallet_address, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      if (sequentialWallets) {
        const addresses = sequentialWallets.map((u: any) => u.wallet_address.toLowerCase())
        const currentAddr = walletAddress.toLowerCase()
        
        // Проверяем на последовательные номера
        const lastBytes = currentAddr.slice(-8)
        const sequentialCount = addresses.filter(addr => {
          const otherBytes = addr.slice(-8)
          const diff = parseInt(lastBytes, 16) - parseInt(otherBytes, 16)
          return Math.abs(diff) <= 10 && diff !== 0
        }).length

        if (sequentialCount >= 3) {
          score += 30
          reasons.push(`Sequential wallet pattern detected (${sequentialCount} similar addresses)`)
        }

        // Проверяем на одинаковые префиксы/суффиксы
        const prefixCount = addresses.filter(addr => 
          addr.slice(0, 10) === currentAddr.slice(0, 10)
        ).length

        if (prefixCount >= 2) {
          score += 20
          reasons.push(`Similar wallet prefix pattern detected`)
        }
      }

      // Проверяем новые кошельки (созданные недавно)
      const walletAge = await this.getWalletAge(walletAddress)
      if (walletAge !== null && walletAge < 7) { // Меньше недели
        score += 15
        reasons.push(`Very new wallet (${walletAge} days old)`)
      }

    } catch (error) {
      console.error('[AntiSybil] Wallet pattern check error:', error)
    }

    return { score, reasons }
  }

  /**
   * 2️⃣ Проверка переиспользования социальных аккаунтов
   */
  private async checkSocialAccountReuse(fingerprint: UserFingerprint): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 0

    try {
      const checks = []

      // Twitter
      if (fingerprint.twitterUsername) {
        checks.push(
          this.supabase
            .from('users')
            .select('id, wallet_address')
            .eq('twitter_username', fingerprint.twitterUsername)
            .neq('wallet_address', fingerprint.walletAddress)
        )
      }

      // Telegram
      if (fingerprint.telegramUsername) {
        checks.push(
          this.supabase
            .from('users')
            .select('id, wallet_address')
            .eq('telegram_username', fingerprint.telegramUsername)
            .neq('wallet_address', fingerprint.walletAddress)
        )
      }

      // Discord
      if (fingerprint.discordUsername) {
        checks.push(
          this.supabase
            .from('users')
            .select('id, wallet_address')
            .eq('discord_username', fingerprint.discordUsername)
            .neq('wallet_address', fingerprint.walletAddress)
        )
      }

      const results = await Promise.all(checks)
      
      results.forEach((result, index) => {
        if (result.data && result.data.length > 0) {
          score += 40 // Критический риск
          const platform = ['Twitter', 'Telegram', 'Discord'][index]
          reasons.push(`${platform} account already linked to ${result.data.length} other wallet(s)`)
        }
      })

    } catch (error) {
      console.error('[AntiSybil] Social account reuse check error:', error)
    }

    return { score, reasons }
  }

  /**
   * 3️⃣ Проверка поведенческих паттернов
   */
  private async checkBehaviorPatterns(walletAddress: string): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 0

    try {
      // Проверяем частоту действий
      const { data: recentActions } = await this.supabase
        .from('points_transactions')
        .select('created_at, type, amount')
        .eq('user_id', (await this.getUserByWallet(walletAddress))?.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (recentActions) {
        // Слишком много действий за день
        if (recentActions.length > 50) {
          score += 25
          reasons.push(`Excessive activity: ${recentActions.length} actions in 24h`)
        }

        // Проверяем на роботизированное поведение (одинаковые интервалы)
        const intervals = []
        for (let i = 1; i < recentActions.length; i++) {
          const prev = new Date(recentActions[i-1].created_at).getTime()
          const curr = new Date(recentActions[i].created_at).getTime()
          intervals.push(curr - prev)
        }

        if (intervals.length > 5) {
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
          const variance = intervals.reduce((acc, val) => acc + Math.pow(val - avgInterval, 2), 0) / intervals.length
          const stdDev = Math.sqrt(variance)
          
          // Слишком регулярные интервалы = бот
          if (stdDev < avgInterval * 0.1 && avgInterval < 300000) { // < 5 минут с низкой вариацией
            score += 30
            reasons.push('Robotic behavior pattern detected')
          }
        }
      }

    } catch (error) {
      console.error('[AntiSybil] Behavior pattern check error:', error)
    }

    return { score, reasons }
  }

  /**
   * 4️⃣ Проверка кластеризации по IP
   */
  private async checkIPClustering(ipAddress?: string): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 0

    if (!ipAddress) return { score: 0, reasons: [] }

    try {
      // Проверяем количество аккаунтов с одного IP
      const { data: sameIPUsers, count } = await this.supabase
        .from('user_sessions')
        .select('user_id', { count: 'exact' })
        .eq('ip_address', ipAddress)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      if (count && count > 5) {
        score += Math.min(40, count * 5) // Максимум 40 баллов
        reasons.push(`${count} accounts from same IP in last 7 days`)
      }

      // Проверяем подсети (/24)
      const subnet = ipAddress.split('.').slice(0, 3).join('.')
      const { count: subnetCount } = await this.supabase
        .from('user_sessions')
        .select('user_id', { count: 'exact' })
        .like('ip_address', `${subnet}.%`)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      if (subnetCount && subnetCount > 10) {
        score += 20
        reasons.push(`${subnetCount} accounts from same subnet`)
      }

    } catch (error) {
      console.error('[AntiSybil] IP clustering check error:', error)
    }

    return { score, reasons }
  }

  /**
   * 5️⃣ Проверка отпечатков устройств
   */
  private async checkDeviceFingerprinting(fingerprint: UserFingerprint): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 0

    try {
      if (fingerprint.userAgent && fingerprint.screenResolution) {
        const deviceSignature = `${fingerprint.userAgent}_${fingerprint.screenResolution}_${fingerprint.timezone}`
        
        const { count } = await this.supabase
          .from('user_sessions')
          .select('user_id', { count: 'exact' })
          .eq('device_signature', deviceSignature)
          .neq('wallet_address', fingerprint.walletAddress)

        if (count && count > 3) {
          score += 25
          reasons.push(`Same device signature used by ${count} different accounts`)
        }
      }

    } catch (error) {
      console.error('[AntiSybil] Device fingerprinting check error:', error)
    }

    return { score, reasons }
  }

  /**
   * 6️⃣ Проверка временных паттернов
   */
  private async checkTemporalPatterns(walletAddress: string): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 0

    try {
      const user = await this.getUserByWallet(walletAddress)
      if (!user) return { score: 0, reasons: [] }

      // Проверяем время создания аккаунта
      const createdAt = new Date(user.created_at)
      const now = new Date()
      const accountAge = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

      // Массовая регистрация в короткий период
      const { count: recentRegistrations } = await this.supabase
        .from('users')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(createdAt.getTime() - 60 * 60 * 1000).toISOString()) // ±1 час
        .lte('created_at', new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString())

      if (recentRegistrations && recentRegistrations > 10) {
        score += 20
        reasons.push(`${recentRegistrations} accounts created within 1 hour window`)
      }

      // Слишком новый аккаунт с высокой активностью
      if (accountAge < 1 && user.total_points > 500) {
        score += 15
        reasons.push('High activity on very new account')
      }

    } catch (error) {
      console.error('[AntiSybil] Temporal pattern check error:', error)
    }

    return { score, reasons }
  }

  /**
   * 7️⃣ Проверка паттернов транзакций
   */
  private async checkTransactionPatterns(walletAddress: string): Promise<{ score: number; reasons: string[] }> {
    const reasons: string[] = []
    let score = 0

    try {
      const user = await this.getUserByWallet(walletAddress)
      if (!user) return { score: 0, reasons: [] }

      // Проверяем паттерны начисления поинтов
      const { data: transactions } = await this.supabase
        .from('points_transactions')
        .select('amount, type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (transactions && transactions.length > 10) {
        // Проверяем на одинаковые суммы (подозрительно)
        const amounts = transactions.map(t => t.amount)
        const uniqueAmounts = [...new Set(amounts)]
        
        if (uniqueAmounts.length < amounts.length * 0.3) { // Менее 30% уникальных сумм
          score += 15
          reasons.push('Repetitive transaction amounts pattern')
        }

        // Проверяем на слишком регулярные транзакции
        const dailyRituals = transactions.filter(t => t.type === 'daily_ritual')
        if (dailyRituals.length > 7) { // Больше недели
          const dates = dailyRituals.map(t => new Date(t.created_at).toDateString())
          const uniqueDates = [...new Set(dates)]
          
          if (uniqueDates.length === dailyRituals.length && dailyRituals.length > 14) {
            // Идеальная посещаемость больше 2 недель подряд
            score += 10
            reasons.push('Perfect daily ritual attendance (suspicious consistency)')
          }
        }
      }

    } catch (error) {
      console.error('[AntiSybil] Transaction pattern check error:', error)
    }

    return { score, reasons }
  }

  /**
   * Вспомогательные методы
   */
  private async getUserByWallet(walletAddress: string) {
    const { data } = await this.supabase
      .from('users')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .single()
    
    return data
  }

  private async getWalletAge(walletAddress: string): Promise<number | null> {
    try {
      // В реальном проекте здесь был бы запрос к Ethereum API
      // Для демо возвращаем случайный возраст
      return Math.floor(Math.random() * 365)
    } catch {
      return null
    }
  }
}

/**
 * 🛡️ ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ ДЛЯ РИТУАЛОВ
 */
export class RitualAntiSybil {
  private antiSybil: AntiSybilProtection

  constructor() {
    this.antiSybil = new AntiSybilProtection()
  }

  /**
   * Проверка специфично для Daily Ritual
   */
  async checkRitualEligibility(
    walletAddress: string,
    tweetUrl: string,
    tweetAuthor: string,
    userTwitter?: string
  ): Promise<{ allowed: boolean; reasons: string[] }> {
    const reasons: string[] = []

    // 1. Проверка привязанного Twitter аккаунта
    if (userTwitter && tweetAuthor.toLowerCase() !== userTwitter.toLowerCase()) {
      reasons.push(`Tweet must be from your verified account @${userTwitter}, not @${tweetAuthor}`)
      return { allowed: false, reasons }
    }

    // 2. Проверка на переиспользование твитов
    const isDuplicateTweet = await this.checkDuplicateTweet(tweetUrl)
    if (isDuplicateTweet) {
      reasons.push('This tweet has already been used for ritual verification')
      return { allowed: false, reasons }
    }

    // 3. Проверка частоты ритуалов от одного Twitter аккаунта
    const twitterOveruse = await this.checkTwitterOveruse(tweetAuthor)
    if (twitterOveruse.overused) {
      reasons.push(`Twitter account @${tweetAuthor} has been used too frequently (${twitterOveruse.count} times in 7 days)`)
      return { allowed: false, reasons }
    }

    // 4. Общая проверка анти-сибил
    const sybilCheck = await this.antiSybil.checkUser({
      walletAddress,
      twitterUsername: tweetAuthor
    })

    if (!sybilCheck.allowed) {
      reasons.push(...sybilCheck.reasons)
      return { allowed: false, reasons }
    }

    return { allowed: true, reasons: [] }
  }

  private async checkDuplicateTweet(tweetUrl: string): Promise<boolean> {
    try {
      const supabase = this.antiSybil['supabase']
      const { data } = await supabase
        .from('daily_rituals')
        .select('id')
        .eq('tweet_url', tweetUrl)
        .limit(1)

      return data && data.length > 0
    } catch {
      return false
    }
  }

  private async checkTwitterOveruse(twitterUsername: string): Promise<{ overused: boolean; count: number }> {
    try {
      const supabase = this.antiSybil['supabase']
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      // Считаем сколько раз этот Twitter аккаунт использовался для ритуалов
      const { data } = await supabase
        .from('daily_rituals')
        .select('id, tweet_url')
        .gte('created_at', weekAgo)

      if (!data) return { overused: false, count: 0 }

      // Извлекаем username из tweet_url и считаем
      let count = 0
      for (const ritual of data) {
        if (ritual.tweet_url) {
          const match = ritual.tweet_url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\//)
          if (match && match[1].toLowerCase() === twitterUsername.toLowerCase()) {
            count++
          }
        }
      }

      return { overused: count > 7, count } // Максимум 7 ритуалов в неделю с одного Twitter
    } catch {
      return { overused: false, count: 0 }
    }
  }
}

/**
 * 📊 СИСТЕМА РЕПУТАЦИИ
 */
export class ReputationSystem {
  private supabase: any

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }

  /**
   * Рассчитать репутацию пользователя
   */
  async calculateReputation(walletAddress: string): Promise<number> {
    try {
      const user = await this.getUserByWallet(walletAddress)
      if (!user) {
        console.log('[Reputation] User not found for wallet:', walletAddress.slice(0, 10) + '...')
        return 50 // Базовая репутация для новых пользователей
      }

      let reputation = 50 // Базовая репутация

      // Бонусы за верификацию
      if (user.twitter_username) reputation += 15
      if (user.telegram_username) reputation += 10
      if (user.discord_username) reputation += 10

      // Бонусы за активность
      const accountAge = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
      reputation += Math.min(20, accountAge / 7) // +1 за каждую неделю, максимум 20

      // Бонусы за стрик
      reputation += Math.min(15, user.current_streak || 0)

      // Штрафы за подозрительную активность (но не применяем для новых пользователей)
      if (accountAge > 1) { // Только для пользователей старше 1 дня
        const antiSybil = new AntiSybilProtection()
        const sybilCheck = await antiSybil.checkUser({
          walletAddress,
          twitterUsername: user.twitter_username,
          telegramUsername: user.telegram_username,
          discordUsername: user.discord_username
        })

        reputation -= sybilCheck.score * 0.3 // Уменьшенный штраф за риск
      }

      const finalReputation = Math.max(30, Math.min(100, reputation)) // Минимум 30 для всех
      console.log('[Reputation] Calculated for', walletAddress.slice(0, 10) + '...:', finalReputation)
      
      return finalReputation
    } catch (error) {
      console.error('[Reputation] Error calculating reputation:', error)
      return 50 // Возвращаем базовую репутацию при ошибке
    }
  }

  private async getUserByWallet(walletAddress: string) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress) // Используем точное совпадение вместо ilike
        .single()
      
      if (error) {
        console.log('[Reputation] Database error:', error.message)
        return null
      }
      
      return data
    } catch (error) {
      console.error('[Reputation] getUserByWallet error:', error)
      return null
    }
  }
}