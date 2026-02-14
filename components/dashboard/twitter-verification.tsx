"use client"

import { useState } from "react"
import { apiCall } from "@/lib/api/authenticated-fetch"
import { Twitter, ExternalLink, Check, AlertCircle, Loader2 } from "lucide-react"

interface TwitterVerificationProps {
  walletAddress: string
  onVerified: (username: string, bonusPoints: number) => void
}

type Step = "start" | "tweet" | "verifying" | "success" | "error"

export function TwitterVerification({ walletAddress, onVerified }: TwitterVerificationProps) {
  const [step, setStep] = useState<Step>("start")
  const [tweetUrl, setTweetUrl] = useState("")
  const [error, setError] = useState("")
  const [verifiedUsername, setVerifiedUsername] = useState("")

  const walletShort = walletAddress.slice(2, 8).toLowerCase()
  const tweetText = `Unlocking ancient wisdom through Web3 mysticism

My destiny code: ${walletShort}

#KabbalahCode`

  const openTwitterIntent = () => {
    const params = new URLSearchParams({ text: tweetText })
    window.open(`https://twitter.com/intent/tweet?${params}`, "_blank", "width=550,height=500")
    setStep("tweet")
  }

  const verifyTweet = async () => {
    if (!tweetUrl) {
      setError("Please enter your tweet URL")
      return
    }

    if (!tweetUrl.includes("twitter.com") && !tweetUrl.includes("x.com")) {
      setError("Please enter a valid Twitter/X URL")
      return
    }

    setStep("verifying")
    setError("")

    try {
      const response = await apiCall("/api/twitter/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetUrl, walletAddress }),
      })

      const data = await response.json()

      if (data.success) {
        setVerifiedUsername(data.data.username)
        setStep("success")
        onVerified(data.data.username, data.data.bonusPoints || 150)
      } else {
        setError(data.error || "Verification failed")
        setStep("error")
      }
    } catch {
      setError("Network error. Please try again.")
      setStep("error")
    }
  }

  if (step === "success") {
    return (
      <div className="p-6 border border-green-500/30 bg-green-500/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-500 flex items-center justify-center">
            <Check className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-serif">Twitter Verified</h2>
            <p className="text-green-400">@{verifiedUsername}</p>
          </div>
        </div>
        <p className="text-white/50">
          You earned <span className="text-[#FF9500] font-bold">+150 points</span> for connecting Twitter.
        </p>
      </div>
    )
  }

  if (step === "start") {
    return (
      <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white font-serif">Connect Twitter</h2>
          <span className="px-3 py-1 bg-[#FF9500]/20 text-[#FF9500] text-xs uppercase font-bold">+150 Points</span>
        </div>

        <p className="text-white/50 mb-4">
          Link your X account by posting a tweet with <span className="text-[#FF9500]">#KabbalahCode</span> and your
          wallet code.
        </p>

        <div className="p-3 bg-black/50 border border-[#FF9500]/20 mb-6">
          <p className="text-white/50 text-xs uppercase mb-1">Your destiny code</p>
          <p className="text-[#FF9500] font-mono text-lg">{walletShort}</p>
        </div>

        <button
          onClick={openTwitterIntent}
          className="w-full py-4 bg-[#FF9500] text-black font-bold uppercase tracking-wide hover:bg-[#FFB340] transition-colors flex items-center justify-center gap-2"
        >
          <Twitter size={18} />
          Post Verification Tweet
        </button>
      </div>
    )
  }

  // Tweet/Error state
  return (
    <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
      {step === "verifying" ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-10 h-10 text-[#FF9500] animate-spin mb-4" />
          <p className="text-white font-medium">Verifying your tweet...</p>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-bold text-white font-serif mb-2">Verify Your Tweet</h2>
          <p className="text-white/50 text-sm mb-4">After posting, paste the tweet URL below.</p>

          <div className="p-3 bg-black/50 border border-[#FF9500]/10 mb-4">
            <p className="text-white/50 text-xs mb-2">Tweet must include:</p>
            <div className="flex gap-3 text-sm">
              <span className="text-[#FF9500]">#KabbalahCode</span>
              <span className="text-white/30">+</span>
              <span className="text-[#FF9500] font-mono">{walletShort}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/30 text-xs">Didn't post yet?</span>
              <button
                onClick={openTwitterIntent}
                className="text-[#FF9500] hover:underline text-sm flex items-center gap-1"
              >
                Post tweet <ExternalLink size={14} />
              </button>
            </div>

            <input
              type="url"
              value={tweetUrl}
              onChange={(e) => {
                setTweetUrl(e.target.value)
                setError("")
              }}
              placeholder="https://twitter.com/yourname/status/..."
              className="w-full bg-transparent border border-[#FF9500]/30 px-4 py-3 text-white focus:border-[#FF9500] focus:outline-none placeholder:text-white/20"
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
              className="w-full py-4 bg-[#FF9500] text-black font-bold uppercase tracking-wide hover:bg-[#FFB340] transition-colors disabled:opacity-50"
            >
              Verify Tweet
            </button>
          </div>
        </>
      )}
    </div>
  )
}
