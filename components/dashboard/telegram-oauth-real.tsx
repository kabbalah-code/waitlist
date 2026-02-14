"use client"

import { useState } from "react"
import { Send, ExternalLink, Loader2, Check, AlertCircle } from "lucide-react"

interface TelegramOAuthRealProps {
  walletAddress: string
  onConnected: (username: string) => void
  onClose: () => void
}

export function TelegramOAuthReal({ walletAddress, onConnected, onClose }: TelegramOAuthRealProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTelegramAuth = async () => {
    setLoading(true)
    setError('')

    try {
      // Start OAuth flow
      const response = await fetch('/api/auth/telegram/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ walletAddress })
      })

      const data = await response.json()
      
      if (data.success) {
        // Redirect to Telegram OAuth
        window.location.href = data.authUrl
      } else {
        // Handle specific error codes
        if (data.code === 'TELEGRAM_NOT_CONFIGURED') {
          setError('Telegram integration is currently under development. Please check back later!')
        } else if (data.code === 'ALREADY_CONNECTED') {
          setError('Telegram account is already connected to this wallet.')
        } else {
          setError(data.error || 'Failed to start Telegram authentication')
        }
      }
    } catch (error) {
      console.error('[Telegram] OAuth error:', error)
      setError('Network error. Please try again.')
    } finally {
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
            Connect your Telegram account securely using official Telegram OAuth.
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

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded">
            <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              How it works:
            </h4>
            <ol className="text-sm text-white/70 space-y-1 list-decimal list-inside">
              <li>Click "Connect with Telegram" below</li>
              <li>You'll be redirected to Telegram</li>
              <li>Authorize the connection</li>
              <li>Return here to receive your rewards</li>
            </ol>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleTelegramAuth}
            disabled={loading}
            className="w-full py-3 bg-[#0088cc] text-white font-bold hover:bg-[#0099dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting OAuth...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Connect with Telegram
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
            <h4 className="text-green-400 font-medium mb-2">🔒 Security:</h4>
            <ul className="text-sm text-white/70 space-y-1">
              <li>• Real OAuth authentication</li>
              <li>• No fake usernames accepted</li>
              <li>• Cryptographic verification</li>
              <li>• One account per wallet</li>
            </ul>
          </div>

          <p className="text-white/40 text-xs text-center">
            You'll be redirected to Telegram to authorize the connection
          </p>
        </div>
      </div>
    </div>
  )
}