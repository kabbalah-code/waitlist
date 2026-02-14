"use client"

import { useState } from "react"
import { Send, Loader2, Check, AlertCircle, ExternalLink, Copy } from "lucide-react"

interface TelegramSimpleConnectProps {
  walletAddress: string
  onConnected: (username: string) => void
  onClose: () => void
}

export function TelegramSimpleConnect({ walletAddress, onConnected, onClose }: TelegramSimpleConnectProps) {
  const [step, setStep] = useState<'instructions' | 'verify'>('instructions')
  const [telegramUsername, setTelegramUsername] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Generate verification code based on wallet
  const generateVerificationCode = () => {
    const code = `KC-${walletAddress.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`
    setVerificationCode(code)
    return code
  }

  const handleStartVerification = () => {
    if (!telegramUsername.trim()) {
      setError('Please enter your Telegram username')
      return
    }

    let username = telegramUsername.trim()
    if (!username.startsWith('@')) {
      username = '@' + username
    }
    setTelegramUsername(username)

    const code = generateVerificationCode()
    setStep('verify')
    setError('')
  }

  const copyVerificationCode = () => {
    navigator.clipboard.writeText(verificationCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleVerify = async () => {
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
          telegramUsername,
          verificationCode
        })
      })

      const data = await response.json()

      if (data.success) {
        onConnected(telegramUsername)
        onClose()
      } else {
        setError(data.error || 'Verification failed. Please try again.')
      }
    } catch (err) {
      console.error('[Telegram] Verification error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'instructions') {
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

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleStartVerification}
              disabled={loading || !telegramUsername.trim()}
              className="w-full py-3 bg-[#0088cc] text-white font-bold hover:bg-[#0099dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Verification
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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#0088cc]/30 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Send className="w-6 h-6 text-[#0088cc]" />
            <h2 className="text-xl font-bold text-white">Verify Telegram</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded">
            <h4 className="text-blue-400 font-medium mb-2">Step 1: Copy verification code</h4>
            <div className="flex gap-2 items-center">
              <code className="flex-1 bg-black/50 border border-blue-500/30 px-3 py-2 text-blue-300 font-mono text-sm">
                {verificationCode}
              </code>
              <button
                onClick={copyVerificationCode}
                className="px-3 py-2 bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded">
            <h4 className="text-green-400 font-medium mb-2">Step 2: Send message to yourself</h4>
            <ol className="text-sm text-white/70 space-y-1 list-decimal list-inside">
              <li>Open Telegram and find "Saved Messages"</li>
              <li>Paste and send the verification code</li>
              <li>Come back here and click "Verify"</li>
            </ol>
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
            <h4 className="text-yellow-400 font-medium mb-2">Alternative: Send to any chat</h4>
            <p className="text-sm text-white/70">
              You can send the code to any Telegram chat or group. We'll detect it automatically.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep('instructions')}
              className="flex-1 py-3 bg-gray-600 text-white font-bold hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex-1 py-3 bg-[#0088cc] text-white font-bold hover:bg-[#0099dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Connection'
              )}
            </button>
          </div>

          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
            <h4 className="text-green-400 font-medium mb-2">🔒 How verification works:</h4>
            <ul className="text-sm text-white/70 space-y-1">
              <li>• We check if you can send messages from {telegramUsername}</li>
              <li>• Verification code proves account ownership</li>
              <li>• No access to your private messages</li>
              <li>• Secure and privacy-friendly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}