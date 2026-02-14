"use client"

import React, { useState, useEffect } from "react"
import { Sparkles, CheckCircle, Brain, Loader2 } from "lucide-react"

interface DailyMeditationProps {
  walletAddress: string
  hasCompletedToday: boolean
  onComplete: (kcode: number) => void
}

// Временные тексты для медитации (позже можно заменить на API)
const MEDITATION_TEXTS = [
  "In stillness, the soul finds its true voice. Listen deeply to the whispers of your inner wisdom.",
  "The Tree of Life grows within you. Each breath connects you to the infinite source of creation.",
  "Ancient knowledge flows through your consciousness. Open your mind to receive divine guidance.",
  "In this moment, you are one with the universe. Feel the sacred energy flowing through every cell.",
  "The path of enlightenment begins with a single breath. Embrace the journey within.",
  "Your thoughts create your reality. Choose wisdom, choose light, choose transformation.",
  "The Sephirot illuminate your path. Trust in the divine order of your spiritual journey.",
  "In meditation, we transcend the physical and touch the eternal. You are infinite consciousness.",
  "Every moment of stillness is a step closer to enlightenment. Honor this sacred practice.",
  "The universe speaks in silence. Quiet your mind and hear the cosmic symphony within.",
]

export function DailyMeditation({
  walletAddress,
  hasCompletedToday,
  onComplete,
}: DailyMeditationProps) {
  const [step, setStep] = useState<"idle" | "meditating" | "claiming" | "complete">(
    hasCompletedToday ? "complete" : "idle"
  )
  const [meditationText, setMeditationText] = useState("")
  const [timeRemaining, setTimeRemaining] = useState(60) // 60 seconds = 1 minute
  const [error, setError] = useState("")
  const [isPaused, setIsPaused] = useState(false)

  // Pause timer when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (step === "meditating") {
        setIsPaused(document.hidden)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [step])

  // Countdown timer
  useEffect(() => {
    if (step === "meditating" && timeRemaining > 0 && !isPaused) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [step, timeRemaining, isPaused])

  const startMeditation = () => {
    // Select random meditation text
    const randomText = MEDITATION_TEXTS[Math.floor(Math.random() * MEDITATION_TEXTS.length)]
    setMeditationText(randomText)
    setTimeRemaining(60)
    setStep("meditating")
  }

  const claimReward = async () => {
    setStep("claiming")
    setError("")

    try {
      const { apiCall } = await import('@/lib/api/authenticated-fetch')
      const response = await apiCall('/api/meditation/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meditationText,
        })
      })

      const data = await response.json()

      if (data.success) {
        setStep("complete")
        onComplete(data.data.kcode)
      } else {
        setError(data.error || "Failed to claim reward")
        setStep("meditating")
      }
    } catch (err) {
      console.error("Meditation claim error:", err)
      setError("Network error. Please try again.")
      setStep("meditating")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Load meditation text if completed today
  useEffect(() => {
    if ((step === "complete" || hasCompletedToday) && !meditationText) {
      const loadMeditationText = async () => {
        try {
          const { apiCall } = await import('@/lib/api/authenticated-fetch')
          const response = await apiCall('/api/meditation/today')
          const data = await response.json()
          
          if (data.success && data.meditation?.meditation_text) {
            setMeditationText(data.meditation.meditation_text)
          }
        } catch (err) {
          console.error('Error loading meditation text:', err)
        }
      }
      loadMeditationText()
    }
  }, [step, hasCompletedToday, meditationText])

  if (step === "complete" || hasCompletedToday) {
    return (
      <div className="p-6 border border-green-500/30 bg-green-500/5">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <h2 className="text-xl font-bold text-white font-serif">Meditation Complete</h2>
        </div>
        
        {meditationText && (
          <div className="mb-4 p-4 bg-gradient-to-r from-[#FF9500]/10 to-transparent border border-[#FF9500]/30">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-[#FF9500]" />
              <span className="text-[#FF9500] text-sm font-bold">Today's Meditation</span>
            </div>
            <p className="text-white italic text-lg leading-relaxed">&ldquo;{meditationText}&rdquo;</p>
          </div>
        )}
        
        <p className="text-white/50 text-sm">Return tomorrow for your next meditation session.</p>
      </div>
    )
  }

  if (step === "idle") {
    return (
      <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white font-serif">Daily Meditation</h2>
          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs uppercase font-bold">Available</span>
        </div>
        <p className="text-white/50 mb-4">
          Take a moment of stillness. Reflect on ancient wisdom and earn rewards for mindful practice.
        </p>
        <div className="flex items-center gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#FF9500]" />
            <span className="text-white/70">1 minute meditation</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF9500]" />
            <span className="text-white/70">+1 KCODE</span>
          </div>
        </div>
        <button
          onClick={startMeditation}
          className="w-full py-4 bg-[#FF9500] text-black font-bold uppercase tracking-wide hover:bg-[#FFB340] transition-colors"
        >
          Begin Meditation
        </button>
      </div>
    )
  }

  if (step === "meditating") {
    const canClaim = timeRemaining === 0

    return (
      <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
        <h2 className="text-xl font-bold text-white font-serif mb-6">Meditation in Progress</h2>

        {/* Meditation Text */}
        <div className="p-6 bg-gradient-to-br from-[#FF9500]/10 to-black border border-[#FF9500]/50 mb-6 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-[#FF9500]" />
            <span className="text-[#FF9500] text-sm uppercase tracking-wide">Reflect on this wisdom</span>
          </div>
          <p className="text-white text-lg leading-relaxed italic text-center py-4">
            &ldquo;{meditationText}&rdquo;
          </p>
        </div>

        {/* Timer Display or Claim Button */}
        {!canClaim ? (
          // Show timer while meditating
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 border-[#FF9500]/30 bg-[#FF9500]/5 mb-4">
              <span className="text-4xl font-bold text-[#FF9500] font-mono">
                {formatTime(timeRemaining)}
              </span>
            </div>
            <p className="text-white/50 text-sm">
              {isPaused ? "⏸️ Paused - Return to this tab to continue" : "Take this time to reflect deeply..."}
            </p>
          </div>
        ) : (
          // Show claim button when timer is done
          <>
            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Claim Button */}
            <button
              onClick={claimReward}
              className="w-full py-4 bg-[#FF9500] text-black font-bold uppercase tracking-wide hover:bg-[#FFB340] transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              Claim Reward
            </button>
          </>
        )}
      </div>
    )
  }

  if (step === "claiming") {
    return (
      <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-10 h-10 text-[#FF9500] animate-spin mb-4" />
          <p className="text-white/70">Claiming your reward...</p>
        </div>
      </div>
    )
  }

  return null
}
