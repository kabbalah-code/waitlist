"use client"

import React, { useState } from "react"
import { generatePrediction, type Prediction } from "@/lib/predictions/generator"
import { verifyRitual } from "@/lib/api/client"
import { POINTS_CONFIG, calculateStreakBonus } from "@/lib/points/calculator"
import { Sparkles, Share2, CheckCircle, ExternalLink, Copy, Check, AlertCircle, Loader2 } from "lucide-react"

interface DailyRitualProps {
  walletAddress: string
  walletNumber: number
  currentStreak: number
  hasCompletedToday: boolean
  twitterConnected: boolean
  onComplete: (kcode: number, newStreak: number, newFreeSpins: number, tokensAwarded?: number, transactionHash?: string, alternativeReward?: any) => void
}

export function DailyRitual({
  walletAddress,
  walletNumber,
  currentStreak,
  hasCompletedToday,
  twitterConnected,
  onComplete,
}: DailyRitualProps) {
  const [step, setStep] = useState<"idle" | "prophecy" | "share" | "verify" | "complete">(
    hasCompletedToday ? "complete" : "idle",
  )
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [tweetUrl, setTweetUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [tokensAwarded, setTokensAwarded] = useState(0)
  const [transactionHash, setTransactionHash] = useState("")
  const [alternativeReward, setAlternativeReward] = useState<any>(null)
  const [maxSupplyReached, setMaxSupplyReached] = useState(false)
  const [loadingPrediction, setLoadingPrediction] = useState(false)

  const walletShort = walletAddress.slice(2, 8).toLowerCase()

  // ✅ Загружаем последнее предсказание если ритуал уже выполнен
  React.useEffect(() => {
    if (hasCompletedToday && !prediction) {
      loadTodaysPrediction()
    }
  }, [hasCompletedToday, walletAddress])

  const loadTodaysPrediction = async () => {
    try {
      setLoadingPrediction(true)
      console.log('[DailyRitual] Loading today\'s prediction...')
      const { apiCall } = await import('@/lib/api/authenticated-fetch')
      const response = await apiCall('/api/ritual/today')
      
      console.log('[DailyRitual] API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[DailyRitual] API response data:', data)
        
        if (data.success && data.ritual) {
          // Восстанавливаем предсказание из сохраненных данных
          const savedPrediction = {
            message: data.ritual.prediction_text,
            code: data.ritual.prediction_code || `${walletShort}-${new Date().toISOString().slice(0, 10)}`,
            sephira: { name: data.ritual.sephira_name || 'Keter' },
            domain: { name: data.ritual.domain_name || 'Wisdom' }
          }
          setPrediction(savedPrediction)
          
          // Восстанавливаем информацию о наградах
          if (data.ritual.tokens_awarded) {
            setTokensAwarded(data.ritual.tokens_awarded)
          }
          if (data.ritual.transaction_hash) {
            setTransactionHash(data.ritual.transaction_hash)
          }
          
          console.log('[DailyRitual] ✅ Prediction loaded successfully')
        } else {
          console.log('[DailyRitual] ❌ No ritual data in response')
        }
      } else {
        const errorData = await response.json()
        console.error('[DailyRitual] API error:', errorData)
      }
    } catch (error) {
      console.error('[DailyRitual] Error loading today\'s prediction:', error)
    } finally {
      setLoadingPrediction(false)
    }
  }

  const startRitual = () => {
    const newPrediction = generatePrediction(walletAddress, walletNumber)
    setPrediction(newPrediction)
    setStep("prophecy")
  }

  const shareToTwitter = () => {
    if (!prediction) return

    const shareText = `${prediction.message}\n#KabbalahCode`
    const text = encodeURIComponent(shareText)
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}`
    window.open(twitterUrl, "_blank", "width=550,height=420")
    setStep("share")
  }

  const copyPrediction = () => {
    if (!prediction) return
    const shareText = `${prediction.message}\n#KabbalahCode`
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const verifyTweet = async () => {
    if (!tweetUrl.includes("twitter.com") && !tweetUrl.includes("x.com")) {
      setError("Please enter a valid Twitter/X URL")
      return
    }

    if (!prediction) {
      setError("Prediction not found")
      return
    }

    setStep("verify")
    setError("")

    try {
      // ✅ Используем API client (автоматически передаёт credentials)
      const data = await verifyRitual(tweetUrl, prediction.message)

      console.log("[Ritual] API response:", data)

      if (data.success) {
        setStep("complete")
        setTokensAwarded(data.data.tokensAwarded || 0)
        setTransactionHash(data.data.transactionHash || "")
        setAlternativeReward(data.data.alternativeReward || null)
        setMaxSupplyReached(data.data.maxSupplyReached || false)
        
        console.log("[Ritual] Calling onComplete callback with:", {
          kcode: data.data.kcode,
          newStreak: data.data.newStreak,
          freeSpins: data.data.freeSpins,
          tokensAwarded: data.data.tokensAwarded
        })
        
        onComplete(
          data.data.kcode, 
          data.data.newStreak,
          data.data.freeSpins || 0, // Передаем новое количество free spins
          data.data.tokensAwarded, 
          data.data.transactionHash,
          data.data.alternativeReward
        )
      } else {
        setError(data.error || "Verification failed")
        setStep("share")
      }
    } catch (err) {
      setError("Network error. Please try again.")
      setStep("share")
    }
  }

  if (step === "complete" || hasCompletedToday) {
    return (
      <div className="p-6 border border-green-500/30 bg-green-500/5">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <h2 className="text-xl font-bold text-white font-serif">Ritual Complete</h2>
        </div>
        
        {/* ✅ ПОКАЗЫВАЕМ ПРЕДСКАЗАНИЕ ПОЛЬЗОВАТЕЛЯ */}
        {loadingPrediction ? (
          <div className="mb-4 p-4 bg-black/50 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
              <span className="text-white/50 text-sm">Loading your prophecy...</span>
            </div>
          </div>
        ) : prediction ? (
          <div className="mb-4 p-4 bg-gradient-to-r from-[#FF9500]/10 to-transparent border border-[#FF9500]/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#FF9500]" />
              <span className="text-[#FF9500] text-sm font-bold">Your Daily Prophecy</span>
            </div>
            <p className="text-white italic text-lg leading-relaxed mb-2">&ldquo;{prediction.message}&rdquo;</p>
            <div className="flex items-center justify-between">
              <span className="text-[#FF9500] text-sm">{prediction.code}</span>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span>{prediction.sephira.name}</span>
                <span>•</span>
                <span>{prediction.domain.name}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-4 bg-black/50 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-white/50" />
              <span className="text-white/50 text-sm">Prophecy completed but text unavailable</span>
            </div>
          </div>
        )}
        
        <p className="text-white/50 text-sm mb-4">Return tomorrow for your next revelation.</p>
        
        {/* Token rewards display */}
        {tokensAwarded > 0 && !maxSupplyReached && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-bold">+{tokensAwarded} KCODE tokens rewarded!</span>
            </div>
            {transactionHash && (
              <a 
                href={`${process.env.NEXT_PUBLIC_BLOCK_EXPLORER}/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF9500] text-sm hover:underline flex items-center gap-1 mt-1"
              >
                View transaction <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
        
        {/* Alternative rewards display */}
        {alternativeReward && maxSupplyReached && (
          <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 font-bold">MAX SUPPLY Reached!</span>
            </div>
            <p className="text-white/70 text-sm mb-3">
              Token supply exhausted. You've received an exclusive alternative reward:
            </p>
            <div className="bg-black/50 p-3 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1">
                {alternativeReward.type === 'nft' && <span className="text-2xl">🎨</span>}
                {alternativeReward.type === 'achievement' && <span className="text-2xl">🏆</span>}
                {alternativeReward.type === 'premium' && <span className="text-2xl">🌟</span>}
                <span className="text-white font-bold capitalize">{alternativeReward.type} Reward</span>
              </div>
              <p className="text-purple-300 text-sm">{alternativeReward.message}</p>
              {alternativeReward.reward?.name && (
                <p className="text-white/50 text-xs mt-1">{alternativeReward.reward.name}</p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (step === "idle") {
    return (
      <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white font-serif">Daily Ritual</h2>
          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs uppercase font-bold">Available</span>
        </div>
        <p className="text-white/50 mb-4">
          Receive your daily prophecy from the Tree of Life and share it on X to earn points.
        </p>
        <div className="flex items-center gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF9500]" />
            <span className="text-white/70">+{POINTS_CONFIG.DAILY_RITUAL} KCODE</span>
          </div>
          {currentStreak >= 6 && (
            <div className="flex items-center gap-2">
              <span className="text-green-400">+{calculateStreakBonus(currentStreak + 1)} Streak Bonus</span>
            </div>
          )}
        </div>
        <button
          onClick={startRitual}
          className="w-full py-4 bg-[#FF9500] text-black font-bold uppercase tracking-wide hover:bg-[#FFB340] transition-colors"
        >
          Begin Ritual
        </button>
      </div>
    )
  }

  if (step === "prophecy") {
    return (
      <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
        <h2 className="text-xl font-bold text-white font-serif mb-6">Ваше пророчество</h2>

        {prediction && (
          <>
            <div className="p-6 bg-black border border-[#FF9500]/50 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[#FF9500] text-sm uppercase tracking-wide">{prediction.sephira.name}</span>
                <span className="text-white/30">•</span>
                <span className="text-white/50 text-sm">{prediction.domain.name}</span>
              </div>
              <p className="text-white text-lg leading-relaxed mb-4">&ldquo;{prediction.message}&rdquo;</p>
              <div className="flex items-center justify-between">
                <button onClick={copyPrediction} className="p-2 text-white/50 hover:text-white transition-colors">
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <button
              onClick={shareToTwitter}
              className="w-full py-4 bg-[#FF9500] text-black font-bold uppercase tracking-wide hover:bg-[#FFB340] transition-colors flex items-center justify-center gap-2"
            >
              <Share2 size={18} />
              Поделиться в X (Twitter)
            </button>
          </>
        )}
      </div>
    )
  }

  if (step === "share") {
    return (
      <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
        <h2 className="text-xl font-bold text-white font-serif mb-6">Check tweet</h2>

        <p className="text-white/50 mb-4">Paste the link to your tweet to verify and receive points. The tweet must contain the text of your prediction and the hashtag <span className="text-[#FF9500]">#KabbalahCode</span>.</p>

        <div className="space-y-4">
          <input
            type="url"
            value={tweetUrl}
            onChange={(e) => {
              setTweetUrl(e.target.value)
              setError("")
            }}
            placeholder="https://twitter.com/..."
            className="w-full bg-transparent border border-[#FF9500]/30 px-4 py-3 text-white focus:border-[#FF9500] focus:outline-none"
          />

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={verifyTweet}
            disabled={!tweetUrl}
            className="w-full py-4 bg-[#FF9500] text-black font-bold uppercase tracking-wide hover:bg-[#FFB340] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ExternalLink size={18} />
            Check tweet
          </button>
        </div>
      </div>
    )
  }

  if (step === "verify") {
    return (
      <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-10 h-10 text-[#FF9500] animate-spin mb-4" />
          <p className="text-white/70">Verifying your tweet...</p>
        </div>
      </div>
    )
  }

  return null
}