"use client"

import { useEffect, useState } from 'react'
import { sessionManager } from '@/lib/auth/session-manager'

interface SessionProviderProps {
  children: React.ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    async function initializeSession() {
      try {
        console.log('[SessionProvider] Initializing session...')
        
        // Пробуем восстановить сессию
        const restored = await sessionManager.autoRestore()
        
        if (restored) {
          console.log('[SessionProvider] ✅ Session restored successfully')
          setIsAuthenticated(true)
        } else {
          console.log('[SessionProvider] ℹ️ No active session found')
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('[SessionProvider] Error initializing session:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [])

  // Показываем загрузку пока инициализируется сессия
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF9500] mx-auto mb-4"></div>
          <p className="text-white/70">Initializing session...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Hook для использования в компонентах
export function useSession() {
  const [session, setSession] = useState(sessionManager.getSessionData())
  const [userId, setUserId] = useState(sessionManager.getUserId())
  const [isActive, setIsActive] = useState(sessionManager.isSessionActive())

  useEffect(() => {
    // Обновляем состояние при изменении сессии
    const interval = setInterval(() => {
      setSession(sessionManager.getSessionData())
      setUserId(sessionManager.getUserId())
      setIsActive(sessionManager.isSessionActive())
    }, 1000) // Проверяем каждую секунду

    return () => clearInterval(interval)
  }, [])

  const signOut = () => {
    sessionManager.clearSession()
    setSession(null)
    setUserId(null)
    setIsActive(false)
    
    // Перенаправляем на главную
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  return {
    session,
    userId,
    isActive,
    isAuthenticated: !!session && isActive,
    signOut
  }
}