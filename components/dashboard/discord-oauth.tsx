"use client"

import { useState } from "react"
import { MessageCircle, ExternalLink, Loader2, Check, AlertCircle } from "lucide-react"

interface DiscordOAuthProps {
  walletAddress: string
  onConnected: (username: string) => void
  onClose: () => void
}

export function DiscordOAuth({ walletAddress, onConnected, onClose }: DiscordOAuthProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDiscordAuth = async () => {
    setLoading(true)
    setError('')

    try {
      // Start OAuth flow
      const response = await fetch('/api/auth/discord/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ walletAddress })
      })

      const data = await response.json()
      
      if (data.success) {
        // Redirect to Discord OAuth
        window.location.href = data.authUrl
      } else {
        // Handle specific error codes
        if (data.code === 'DISCORD_NOT_CONFIGURED') {
          setError('Discord integration is currently under development. Please check back later!')
        } else {
          setError(data.error || 'Failed to start Discord authentication')
        }
      }
    } catch (error) {
      console.error('[Discord] OAuth error:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#5865F2]/30 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-[#5865F2]" />
            <h2 className="text-xl font-bold text-white">Connect Discord</h2>
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
            Connect your Discord account securely using official Discord OAuth.
          </p>

          <div className="p-4 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded">
            <h4 className="text-white font-medium mb-2">What you'll get:</h4>
            <ul className="text-sm text-white/70 space-y-1">
              <li>• <span className="text-[#FF9500]">100 points</span> + <span className="text-[#FF9500]">1 KCODE token</span></li>
              <li>• Secure account verification</li>
              <li>• Community access and updates</li>
            </ul>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleDiscordAuth}
            disabled={loading}
            className="w-full py-3 bg-[#5865F2] text-white font-bold hover:bg-[#4752C4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting OAuth...
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4" />
                Connect with Discord
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-white/40 text-xs text-center">
            You'll be redirected to Discord to authorize the connection
          </p>
        </div>
      </div>
    </div>
  )
}