"use client"

import { useState, useEffect } from "react"
import { Send, Loader2, Check, AlertCircle, ExternalLink, Copy, Bot } from "lucide-react"

interface TelegramBotConnectProps {
  walletAddress: string
  onConnected: (username: string) => void
  onClose: () => void
}

export function TelegramBotConnect({ walletAddress, onConnected, onClose }: TelegramBotConnectProps) {
  const [telegramUsername, setTelegramUsername] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'username' | 'verification'>('username')
  const [botUsername, setBotUsername] = useState('')
  const [copied, setCopied] = useState(false)

  // Generate verification code when component mounts (stable generation)
  useEffect(() => {
    // Get current wallet from localStorage to ensure we use the active wallet
    const getCurrentWallet = () => {
      try {
        const walletData = localStorage.getItem('kabbalah_wallet')
        if (walletData) {
          const parsed = JSON.parse(walletData)
          return parsed.address?.toLowerCase()
        }
      } catch (error) {
        console.error('[Telegram Bot] Error getting current wallet:', error)
      }
      return walletAddress // fallback to prop
    }
    
    const currentWallet = getCurrentWallet()
    
    if (currentWallet && !verificationCode) {
      // Use current wallet address and timestamp for stable code generation
      const timestamp = Date.now().toString().slice(-4)
      const code = `KC-${currentWallet.slice(-6).toUpperCase()}-${timestamp}`
      setVerificationCode(code)
      console.log('[Telegram Bot] Generated verification code:', code)
      console.log('[Telegram Bot] Using wallet:', currentWallet)
      console.log('[Telegram Bot] Prop wallet:', walletAddress)
      
      if (currentWallet.toLowerCase() !== walletAddress.toLowerCase()) {
        console.warn('[Telegram Bot] ⚠️ Wallet mismatch detected!')
        console.warn('Current wallet:', currentWallet)
        console.warn('Prop wallet:', walletAddress)
      }
    }
  }, [walletAddress, verificationCode])

  const handleUsernameSubmit = async () => {
    if (!telegramUsername.trim()) {
      setError('Please enter your Telegram username')
      return
    }

    let username = telegramUsername.trim()
    if (!username.startsWith('@')) {
      username = '@' + username
    }

    // Update the state with the corrected username
    setTelegramUsername(username)

    // Get bot username when moving to verification step
    try {
      const response = await fetch('/api/telegram/verify-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
          'x-user-id-storage': localStorage.getItem('kabbalah_user_id') || ''
        },
        body: JSON.stringify({
          walletAddress,
          telegramUsername: username,
          verificationCode: 'GET_BOT_INFO' // Special code to get bot info
        })
      })

      const data = await response.json()
      if (data.botUsername) {
        setBotUsername(data.botUsername)
      }
    } catch (error) {
      console.log('Could not get bot info, will show generic instructions')
    }

    setError('')
    setStep('verification')
  }

  const handleVerification = async () => {
    if (!verificationCode) {
      setError('Verification code not generated')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/telegram/verify-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
          'x-user-id-storage': localStorage.getItem('kabbalah_user_id') || ''
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
        // Improve error messages for better user experience
        let errorMessage = data.error || 'Verification failed. Please try again.'
        
        if (errorMessage.includes('not found')) {
          errorMessage = `❌ Verification code not found!\n\n` +
                        `Please make sure you:\n` +
                        `1. Sent the code "${verificationCode}" to @${botUsername || 'testKabbalahcode_bot'}\n` +
                        `2. Wait a few seconds after sending\n` +
                        `3. Try verification again`
        } else if (errorMessage.includes('already linked')) {
          errorMessage = `❌ This Telegram account is already connected to another wallet.\n\n` +
                        `Each Telegram account can only be linked to one wallet.`
        } else if (errorMessage.includes('User not found')) {
          errorMessage = `❌ Authentication error.\n\n` +
                        `Please refresh the page and connect your wallet again.`
        }
        
        setError(errorMessage)
        if (data.botUsername) {
          setBotUsername(data.botUsername)
        }
      }
    } catch (err) {
      console.error('[Telegram Bot] Verification error:', err)
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

  const openTelegram = () => {
    const botName = botUsername || 'testKabbalahcode_bot'
    window.open(`https://t.me/${botName}`, '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#0088cc]/30 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-[#0088cc]" />
            <h2 className="text-xl font-bold text-white">Connect Telegram</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>

        {step === 'username' && (
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
                    onKeyPress={(e) => e.key === 'Enter' && handleUsernameSubmit()}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded">
              <h4 className="text-green-400 font-medium mb-2">🔒 Real Bot Verification:</h4>
              <ul className="text-sm text-white/70 space-y-1">
                <li>• Secure verification through our Telegram Bot</li>
                <li>• Proves you own the Telegram account</li>
                <li>• No access to your private messages</li>
                <li>• One-time verification process</li>
              </ul>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-red-400 text-sm whitespace-pre-line">{error}</div>
              </div>
            )}

            <button
              onClick={handleUsernameSubmit}
              disabled={!telegramUsername.trim()}
              className="w-full py-3 bg-[#0088cc] text-white font-bold hover:bg-[#0099dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Continue
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
        )}

        {step === 'verification' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#0088cc]/10 border border-[#0088cc]/30 rounded">
              <h4 className="text-white font-medium mb-2">Step 1: Copy verification code</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={verificationCode}
                  className="flex-1 bg-black/50 border border-[#0088cc]/30 px-3 py-2 text-white font-mono text-sm"
                />
                <button
                  onClick={copyCode}
                  className="px-3 py-2 bg-[#FF9500] text-black hover:bg-[#FFB340] transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <button
                onClick={() => {
                  // Get current wallet from localStorage
                  const getCurrentWallet = () => {
                    try {
                      const walletData = localStorage.getItem('kabbalah_wallet')
                      if (walletData) {
                        const parsed = JSON.parse(walletData)
                        return parsed.address?.toLowerCase()
                      }
                    } catch (error) {
                      console.error('[Telegram Bot] Error getting current wallet:', error)
                    }
                    return walletAddress // fallback to prop
                  }
                  
                  const currentWallet = getCurrentWallet()
                  const timestamp = Date.now().toString().slice(-4)
                  const newCode = `KC-${currentWallet.slice(-6).toUpperCase()}-${timestamp}`
                  setVerificationCode(newCode)
                  console.log('[Telegram Bot] Generated new verification code:', newCode)
                  console.log('[Telegram Bot] Using current wallet:', currentWallet)
                }}
                className="mt-2 text-xs text-[#0088cc] hover:text-[#0099dd] underline"
              >
                Generate New Code
              </button>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
              <h4 className="text-yellow-400 font-medium mb-2">Step 2: Send to our Bot</h4>
              <p className="text-sm text-white/70 mb-3">
                Send the verification code to our Telegram Bot to prove account ownership.
              </p>
              <button
                onClick={openTelegram}
                className="w-full py-2 bg-[#0088cc] text-white font-medium hover:bg-[#0099dd] transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open @{botUsername || 'testKabbalahcode_bot'}
              </button>
              {!botUsername && (
                <p className="text-xs text-white/50 mt-2">
                  If the link doesn't work, search for @testKabbalahcode_bot in Telegram
                </p>
              )}
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded">
              <h4 className="text-green-400 font-medium mb-2">Step 3: Verify</h4>
              <p className="text-sm text-white/70 mb-3">
                After sending the code to our bot, click verify to complete the connection.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-red-400 text-sm whitespace-pre-line">{error}</div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep('username')}
                className="px-4 py-3 bg-black/50 border border-[#0088cc]/30 text-white hover:bg-black/70 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleVerification}
                disabled={loading}
                className="flex-1 py-3 bg-[#0088cc] text-white font-bold hover:bg-[#0099dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Verify Connection
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
              <h4 className="text-blue-400 font-medium mb-2">🔒 How verification works:</h4>
              <ul className="text-sm text-white/70 space-y-1">
                <li>• We check if you can send messages from {telegramUsername}</li>
                <li>• Verification code proves account ownership</li>
                <li>• No access to your private messages</li>
                <li>• Secure and privacy-friendly</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}