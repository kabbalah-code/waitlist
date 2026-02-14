"use client"

import { useState } from "react"
import { Send, ExternalLink, Loader2, Check, Copy } from "lucide-react"

interface TelegramConnectProps {
  walletAddress: string
  onConnected: (username: string) => void
}

export function TelegramConnect({ walletAddress, onConnected }: TelegramConnectProps) {
  const [step, setStep] = useState<"start" | "verify">("start")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const verificationCode = `🔮 Verifying wallet ${walletAddress.slice(0, 8)}... for Kabbalah Code Game #Web3 #KCODE`
  const botLink = `https://t.me/KabbalahCodeBot?start=${walletAddress.slice(2, 14)}`

  const copyCode = () => {
    navigator.clipboard.writeText(verificationCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const checkVerification = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use our social verification system instead
      const res = await fetch("/api/social/verify/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          platform: "telegram",
          username: `telegram_user_${walletAddress.slice(2, 10)}`
        }),
      })

      const data = await res.json()

      if (data.success) {
        onConnected(data.username)
      } else {
        setError("Telegram verification failed. Please try the social verification in your profile.")
      }
    } catch {
      setError("Verification check failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 border border-[#0088cc]/30 bg-[#0a0a0a]">
      <div className="flex items-center gap-3 mb-6">
        <Send className="w-6 h-6 text-[#0088cc]" />
        <h2 className="text-xl font-bold text-white">Connect Telegram</h2>
      </div>

      {step === "start" && (
        <div className="space-y-4">
          <p className="text-white/70">Connect your Telegram account to verify tasks and receive notifications.</p>

          <div className="p-4 bg-black/50 border border-[#0088cc]/20">
            <p className="text-white/50 text-sm mb-2">Your verification code:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-black px-4 py-2 text-[#0088cc] font-mono text-lg">{verificationCode}</code>
              <button onClick={copyCode} className="p-2 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 transition-colors">
                {copied ? (
                  <Check size={20} className="text-green-400" />
                ) : (
                  <Copy size={20} className="text-[#0088cc]" />
                )}
              </button>
            </div>
          </div>

          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setStep("verify")}
            className="flex items-center justify-center gap-2 w-full py-4 bg-[#0088cc] text-white font-bold hover:bg-[#0099dd] transition-colors"
          >
            Open Telegram Bot <ExternalLink size={18} />
          </a>

          <p className="text-white/40 text-sm text-center">Send /start to the bot, then send your verification code</p>
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
          <p className="text-white/70">After sending the code to the bot, click below to verify:</p>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

          <button
            onClick={checkVerification}
            disabled={isLoading}
            className="w-full py-4 bg-[#0088cc] text-white font-bold hover:bg-[#0099dd] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Checking...
              </>
            ) : (
              "Verify Connection"
            )}
          </button>

          <button onClick={() => setStep("start")} className="w-full py-2 text-white/50 hover:text-white text-sm">
            Back
          </button>
        </div>
      )}
    </div>
  )
}
