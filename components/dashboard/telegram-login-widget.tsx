"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Loader2, Check, AlertCircle, ExternalLink } from "lucide-react"

interface TelegramLoginWidgetProps {
  walletAddress: string
  onConnected: (username: string) => void
  onClose: () => void
}

export function TelegramLoginWidget({ walletAddress, onConnected, onClose }: TelegramLoginWidgetProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [state, setState] = useState('')
  const [widgetLoaded, setWidgetLoaded] = useState(false)
  const telegramRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initialize Telegram Login Widget
    initializeTelegramWidget()
  }, [])

  useEffect(() => {
    if (state && !widgetLoaded) {
      loadTelegramWidget()
    }
  }, [state, widgetLoaded])

  const initializeTelegramWidget = async () => {
    setLoading(true)
    setError('')

    try {
      // Get state from our API
      const response = await fetch('/api/auth/telegram/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ walletAddress })
      })

      const data = await response.json()
      
      if (data.success) {
        setState(data.state)
        // Widget will be loaded after state is set
      } else {
        if (data.code === 'ALREADY_CONNECTED') {
          setError('Telegram account is already connected to this wallet.')
        } else {
          setError(data.error || 'Failed to initialize Telegram login')
        }
      }
    } catch (error) {
      console.error('[Telegram] Widget initialization error:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadTelegramWidget = () => {
    if (!telegramRef.current || widgetLoaded) return

    // Set up global callback function
    (window as any).onTelegramAuth = (user: any) => {
      console.log('[Telegram] User authenticated:', user)
      handleTelegramAuth(user)
    }

    // Create and load Telegram script
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', 'KabbalahCodeBot')
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    
    script.onload = () => {
      setWidgetLoaded(true)
      console.log('[Telegram] Widget loaded successfully')
    }
    
    script.onerror = () => {
      setError('Failed to load Telegram widget. Please try again.')
      console.error('[Telegram] Widget loading failed')
    }

    // Clear container and append script
    telegramRef.current.innerHTML = ''
    telegramRef.current.appendChild(script)
  }

  const handleTelegramAuth = async (telegramUser: any) => {
    setLoading(true)
    setError('')

    try {
      // Send Telegram user data to our callback
      const params = new URLSearchParams({
        id: telegramUser.id.toString(),
        first_name: telegramUser.first_name || '',
        last_name: telegramUser.last_name || '',
        username: telegramUser.username || '',
        photo_url: telegramUser.photo_url || '',
        auth_date: telegramUser.auth_date.toString(),
        hash: telegramUser.hash,
        state: state
      })

      // Redirect to our callback
      window.location.href = `/api/auth/telegram/callback?${params.toString()}`
    } catch (error) {
      console.error('[Telegram] Auth handling error:', error)
      setError('Failed to process Telegram authentication')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#0088cc]/30 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Send className="w-6 h-6 text-[#0088cc]" />
            <h2 className="text-xl font-bold text-white">Connect Telegram</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-white/70 text-sm">
            Connect your Telegram account securely using Telegram's built-in authentication.
          </p>

          <div className="p-4 bg-[#0088cc]/10 border border-[#0088cc]/30 rounded">
            <h4 className="text-white font-medium mb-2">What you'll get:</h4>
            <ul className="text-sm text-white/70 space-y-1">
              <li>• <span className="text-[#FF9500]">100 points</span> + <span className="text-[#FF9500]">1 KCODE token</span></li>
              <li>• Verified account status</li>
              <li>• Access to Telegram tasks</li>
              <li>• Community notifications</li>
            </ul>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#0088cc]" />
              <span className="ml-2 text-white/70">
                {!state ? 'Initializing...' : 'Processing authentication...'}
              </span>
            </div>
          )}

          {state && !loading && !error && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded">
                <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  {widgetLoaded ? 'Click the Telegram button:' : 'Loading Telegram button...'}
                </h4>
                <p className="text-sm text-white/70">
                  {widgetLoaded 
                    ? 'Click the blue Telegram button below to authenticate with your account.'
                    : 'The Telegram login button is loading...'
                  }
                </p>
              </div>

              {/* Telegram Login Widget Container */}
              <div className="flex justify-center py-4">
                <div ref={telegramRef} className="telegram-widget-container">
                  {!widgetLoaded && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-[#0088cc]" />
                      <span className="ml-2 text-white/50 text-sm">Loading Telegram widget...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                <h4 className="text-green-400 font-medium mb-2">🔒 Security:</h4>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>• Official Telegram authentication</li>
                  <li>• No bot creation required</li>
                  <li>• Cryptographic verification</li>
                  <li>• One account per wallet</li>
                </ul>
              </div>
            </div>
          )}

          <p className="text-white/40 text-xs text-center">
            Powered by Telegram's official Login Widget
          </p>
        </div>
      </div>
    </div>
  )
}