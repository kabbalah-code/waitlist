"use client"

import React, { useState } from "react"
import { Zap, Loader2 } from "lucide-react"
import { kabbalhAnswerGenerator, type Answer } from "@/lib/kabbalah/answer-generator"

interface QuickAnswerProps {
  walletAddress: string
}

const ANSWER_STYLES: Record<Answer, string> = {
  "Yes": "text-green-400",
  "No": "text-red-400",
  "Maybe": "text-yellow-400",
  "Wait": "text-blue-400",
}

export function QuickAnswer({ walletAddress }: QuickAnswerProps) {
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [isGetting, setIsGetting] = useState(false)

  const handleGetAnswer = async () => {
    setIsGetting(true)
    setAnswer(null)

    // Simulate thinking time for UX
    await new Promise(resolve => setTimeout(resolve, 800))

    // Generate answer using deterministic numerology
    // Based on wallet + current time (seconds precision)
    const result = kabbalhAnswerGenerator.generateQuickAnswer(walletAddress)
    setAnswer(result.answer)
    setIsGetting(false)

    // Clear answer after 3 seconds
    setTimeout(() => {
      setAnswer(null)
    }, 3000)
  }

  return (
    <div className="p-4 border border-[#FF9500]/20 bg-[#0a0a0a]">
      <p className="text-lg font-bold text-white mb-3">Quick Answer</p>
      
      <button
        onClick={handleGetAnswer}
        disabled={isGetting}
        className="w-full py-3 bg-[#FF9500] text-black font-bold uppercase tracking-wide hover:bg-[#FFB340] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
      >
        {isGetting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Asking...
          </span>
        ) : answer ? (
          <span className={`text-2xl font-bold ${ANSWER_STYLES[answer]}`}>
            {answer}
          </span>
        ) : (
          "Get Answer"
        )}
      </button>
      
      <p className="text-white/30 text-[10px] text-center">
        {answer ? "The spirits have spoken" : "Yes | No | Maybe | Wait"}
      </p>
    </div>
  )
}
