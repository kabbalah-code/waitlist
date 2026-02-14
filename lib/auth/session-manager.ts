/**
 * Session Manager - управление сессиями пользователей
 */

import { getSupabaseClient, initializeSession, getSession } from '@/lib/supabase/client'

export interface SessionData {
  access_token: string
  refresh_token: string
  expires_at: number
  user: any
}

export class SessionManager {
  private static instance: SessionManager
  private session: SessionData | null = null
  private userId: string | null = null

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  /**
   * Инициализация сессии после аутентификации
   */
  async initializeFromAuth(sessionData: SessionData, userId: string): Promise<boolean> {
    try {
      console.log('[SessionManager] Initializing session...')
      
      // Сохраняем в memory
      this.session = sessionData
      this.userId = userId
      
      // Сохраняем в localStorage
      localStorage.setItem('kabbalah_session', JSON.stringify(sessionData))
      localStorage.setItem('kabbalah_user_id', userId)
      
      // Инициализируем Supabase client
      const success = await initializeSession(sessionData)
      
      if (success) {
        console.log('[SessionManager] ✅ Session initialized successfully')
        return true
      } else {
        console.error('[SessionManager] ❌ Failed to initialize Supabase session')
        return false
      }
    } catch (error) {
      console.error('[SessionManager] Error initializing session:', error)
      return false
    }
  }

  /**
   * Восстановление сессии из localStorage
   */
  async restoreFromStorage(): Promise<boolean> {
    try {
      console.log('[SessionManager] Attempting to restore session from storage...')
      
      const sessionStr = localStorage.getItem('kabbalah_session')
      const userIdStr = localStorage.getItem('kabbalah_user_id')
      
      if (!sessionStr || !userIdStr) {
        console.log('[SessionManager] No session data in storage')
        return false
      }
      
      const sessionData = JSON.parse(sessionStr)
      
      // Проверяем не истекла ли сессия
      if (sessionData.expires_at && sessionData.expires_at < Date.now() / 1000) {
        console.log('[SessionManager] Session expired, clearing storage')
        this.clearSession()
        return false
      }
      
      // Восстанавливаем сессию
      this.session = sessionData
      this.userId = userIdStr
      
      // Инициализируем Supabase
      const success = await initializeSession(sessionData)
      
      if (success) {
        console.log('[SessionManager] ✅ Session restored successfully')
        return true
      } else {
        console.log('[SessionManager] ❌ Failed to restore Supabase session')
        this.clearSession()
        return false
      }
    } catch (error) {
      console.error('[SessionManager] Error restoring session:', error)
      this.clearSession()
      return false
    }
  }

  /**
   * Получение текущей сессии
   */
  getSessionData(): SessionData | null {
    return this.session
  }

  /**
   * Получение user ID
   */
  getUserId(): string | null {
    return this.userId
  }

  /**
   * Проверка активности сессии
   */
  isSessionActive(): boolean {
    if (!this.session) return false
    
    // Проверяем срок действия
    if (this.session.expires_at && this.session.expires_at < Date.now() / 1000) {
      return false
    }
    
    return true
  }

  /**
   * Очистка сессии
   */
  clearSession(): void {
    console.log('[SessionManager] Clearing session...')
    
    this.session = null
    this.userId = null
    
    // Очищаем localStorage
    localStorage.removeItem('kabbalah_session')
    localStorage.removeItem('kabbalah_user_id')
    localStorage.removeItem('kabbalah_wallet')
    
    // Очищаем Supabase session
    const supabase = getSupabaseClient()
    supabase.auth.signOut().catch((error: any) => {
      console.error('[SessionManager] Error signing out:', error)
    })
  }

  /**
   * Автоматическое восстановление при загрузке страницы
   */
  async autoRestore(): Promise<boolean> {
    // Сначала пробуем восстановить из Supabase
    const supabaseSession = await getSession()
    
    if (supabaseSession) {
      console.log('[SessionManager] Found active Supabase session')
      
      this.session = {
        access_token: supabaseSession.access_token,
        refresh_token: supabaseSession.refresh_token,
        expires_at: supabaseSession.expires_at || 0,
        user: supabaseSession.user
      }
      
      // Пробуем получить user ID из localStorage
      const userIdStr = localStorage.getItem('kabbalah_user_id')
      if (userIdStr) {
        this.userId = userIdStr
        return true
      }
    }
    
    // Если нет Supabase сессии, пробуем восстановить из localStorage
    return await this.restoreFromStorage()
  }
}

// Экспортируем singleton instance
export const sessionManager = SessionManager.getInstance()