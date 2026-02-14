"use client"

import { useState, useEffect } from "react"
import { MessageCircle, Copy, Check, Loader2, AlertCircle, X } from "lucide-react"

interface DiscordConnectProps {
  walletAddress: string
  onConnected: (username: string) => void
  onClose: () => void
}

export function DiscordConnect({ walletAddress, onConnected, onClose }: DiscordConnectProps) {
  const [step, setStep] = useState<'input' | 'verify' | 'success'>('input')
  const [username, setUsername] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Generate verification code when component mounts
    const code = `🎯 Verifying wallet ${walletAddress.slice(0, 8)}... for Kabbalah Code Game #Web3 #KCODE`
    setVerificationCode(code)
  }, [walletAddress])

  const startVerification = async () => {
    if (!username.trim()) {
      setError('Please enter your Discord username')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/social/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform: 'discord',
          username: username.trim(),
          verificationCode
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setStep('verify')
      } else {
        setError(data.error || 'Failed to start verification')
      }
    } catch (error) {
      console.error('[Discord] Error starting verification:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const completeVerification = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/social/verify/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform: 'discord',
          username: username.trim()
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setStep('success')
        setTimeout(() => {
          onConnected(username.trim())
          onClose()
        }, 2000)
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch (error) {
      console.error('[Discord] Error completing verification:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(verificationCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
            <X size={20} />
          </button>
        </div>

        {step === 'input' && (
          <div className="space-y-4">
            <p className="text-white/70 text-sm">
              Enter your Discord username to start verification
            </p>

            <div>
              <label className="block text-white/50 text-sm mb-2">Discord Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError('')
                }}
                placeholder="username#1234"
                className="w-full bg-black/50 border border-[#5865F2]/30 px-4 py-3 text-white focus:border-[#5865F2] focus:outline-none placeholder:text-white/30"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={startVerification}
              disabled={!username.trim() || loading}
              className="w-full py-3 bg-[#5865F2] text-white font-bold hover:bg-[#4752C4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Verification'
              )}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded">
              <p className="text-white/70 text-sm mb-3">
                Update your Discord status or send this message in any server:
              </p>
              <div className="bg-black/50 p-3 rounded text-sm text-white font-mono break-all">
                {verificationCode}
              </div>
              <button
                onClick={copyCode}
                className="mt-2 w-full py-2 bg-[#5865F2]/20 text-[#5865F2] hover:bg-[#5865F2]/30 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Message
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-yellow-400">
              <AlertCircle className="w-4 h-4" />
              <span>Wait 30 seconds after posting, then click verify</span>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={completeVerification}
                disabled={loading}
                className="flex-1 py-3 bg-[#5865F2] text-white font-bold hover:bg-[#4752C4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </button>
              <button
                onClick={() => setStep('input')}
                className="px-4 py-3 border border-[#5865F2]/30 text-[#5865F2] hover:bg-[#5865F2]/10 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Discord Connected!</h3>
            <p className="text-green-400 mb-2">@{username}</p>
            <p className="text-white/70 text-sm">
              You earned <span className="text-[#FF9500] font-bold">+50 points</span> and <span className="text-[#FF9500] font-bold">0.5 KCODE</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}