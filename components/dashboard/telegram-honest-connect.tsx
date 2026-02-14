"use client"

import { useState } from "react"
import { Send, Loader2, Check, AlertCircle, ExternalLink } from "lucide-react"

interface TelegramHonestConnectProps {
  walletAddress: string
  onConnected: (username: string) => void
  onClose: () => void
}

export function TelegramHonestConnect({ walletAddress, onConnected, onClose }: TelegramHonestConnectProps) {
  const [telegramUsername, setTelegramUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    if (!telegramUsername.trim()) {
      setError('Please enter your Telegram username')
      return
    }

    let username = telegramUsername.trim()
    if (!username.startsWith('@')) {
      username = '@' + username
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/telegram/verify-secure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
          'x-user-id-storage': localStorage.getItem('userId') || ''
        },
        body: JSON.stringify({
          walletAddress,
          telegramUsername: username,
          verificationCode: 'SIMPLE_VERIFICATION' // Not used anymore
        })
      })

      const data = await response.json()

      if (data.success) {
        onConnected(username)
        onClose()
      } else {
        setError(data.error || 'Connection failed. Please try again.')
      }
    } catch (err) {
      console.error('[Telegram] Connection error:', err)
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
          <div className="p-4 bg-[#0088cc]/10 border border-[#0088cc]/30 rounded">
            <h4 className="text-white font-medium mb-2">Rewards:</h4>
            <ul className="text-sm text-white/70 space-y-1">
              <li>• <span className="text-[#FF9500]">100 points</span> + <span className="text-[#FF9500]">1 KCODE token</span></li>
              <li>• Verified account status</li>
              <li>• Access to Telegram tasks</li>
            </ul>
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">
              Your Telegram Username
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">@</span>
                <input
                  type="text"
                  value={telegramUsername.replace('@', '')}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  placeholder="username"
                  className="w-full bg-black/50 border border-[#0088cc]/30 pl-8 pr-4 py-3 text-white focus:outline-none focus:border-[#0088cc]"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
            <h4 className="text-yellow-400 font-medium mb-2">⚠️ Honest System:</h4>
            <ul className="text-sm text-white/70 space-y-1">
              <li>• We trust that you own this Telegram account</li>
              <li>• Please only enter your real username</li>
              <li>• One Telegram account per wallet</li>
              <li>• False information may result in account suspension</li>
            </ul>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={loading || !telegramUsername.trim()}
            className="w-full py-3 bg-[#0088cc] text-white font-bold hover:bg-[#0099dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Connect Telegram
              </>
            )}
          </button>

          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
            <h4 className="text-blue-400 font-medium mb-2">How to find your username:</h4>
            <ol className="text-sm text-white/70 space-y-1 list-decimal list-inside">
              <li>Open Telegram app</li>
              <li>Go to Settings → Edit Profile</li>
              <li>Your username is shown there (without @)</li>
              <li>If you don't have one, create it first</li>
            </ol>
          </div>

          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
            <h4 className="text-green-400 font-medium mb-2">🔒 Privacy:</h4>
            <ul className="text-sm text-white/70 space-y-1">
              <li>• We only store your username</li>
              <li>• No access to your messages</li>
              <li>• No bot installation required</li>
              <li>• Simple and secure</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}