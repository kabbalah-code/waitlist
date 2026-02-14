"use client"

import React, { useState } from "react"
import { Sparkles, X, Loader2, Shield, Lock } from "lucide-react"
import { kabbalhAnswerGenerator, type Answer } from "@/lib/kabbalah/answer-generator"

interface AskKabbalhProps {
  walletAddress: string
}

const ANSWER_STYLES: Record<Answer, { color: string; bg: string; border: string }> = {
  "Yes": { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
  "No": { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  "Maybe": { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  "Wait": { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
}

export function AskKabbalah({ walletAddress }: AskKabbalhProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [calculation, setCalculation] = useState("")
  const [isAsking, setIsAsking] = useState(false)

  const handleAsk = async () => {
    if (!question.trim()) return

    setIsAsking(true)
    setAnswer(null)

    // Simulate thinking time for UX
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Generate answer using deterministic numerology
    // PRIVACY: Question never leaves browser, only hashed locally
    const result = kabbalhAnswerGenerator.generateAnswer(question, walletAddress)
    
    setAnswer(result.answer)
    setCalculation(result.calculation)
    setIsAsking(false)
    
    // Clear question from memory for privacy
    // (React will handle this automatically, but being explicit)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setQuestion("")
    setAnswer(null)
    setCalculation("")
    setIsAsking(false)
  }

  const answerStyle = answer ? ANSWER_STYLES[answer] : ANSWER_STYLES["Yes"]

  return (
    <>
      {/* Card */}
      <div className="p-4 border border-[#FF9500]/20 bg-[#0a0a0a]">
        <p className="text-lg font-bold text-white mb-3">Get Mystical Guidance</p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full py-3 bg-[#FF9500] text-black font-bold uppercase tracking-wide hover:bg-[#FFB340] transition-colors"
        >
          Ask Kabbalah
        </button>
        <p className="text-white/30 text-[10px] mt-2 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          100% Private
        </p>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <div className="relative bg-gradient-to-br from-black/80 to-gray-900/80 backdrop-blur-xl border-2 border-[#FF9500]/50 rounded-2xl p-8">
              {/* Decorative corners */}
              <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-[#FF9500]/70" />
              <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-[#FF9500]/70" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-[#FF9500]/70" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-[#FF9500]/70" />
              
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-6 right-6 text-white/70 hover:text-[#FF9500] transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#FF9500] to-orange-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-black" />
                </div>
                <h2 className="text-2xl font-bold text-[#FF9500] font-serif mb-2">
                  Ask Kabbalah
                </h2>
                <p className="text-white/70 text-sm">
                  Ask any question and receive mystical guidance
                </p>
              </div>

              {/* Privacy Notice */}
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-xs font-bold">100% Private & Confidential</span>
                </div>
                <p className="text-white/50 text-[10px]">
                  Your question never leaves your browser. Calculated locally using sacred numerology.
                </p>
              </div>

              {/* Question Input */}
              <div className="mb-6">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What is your question?"
                  disabled={isAsking || !!answer}
                  className="w-full bg-black/50 border border-[#FF9500]/30 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:border-[#FF9500] focus:outline-none resize-none h-24 disabled:opacity-50"
                />
              </div>

              {/* Answer Display */}
              {answer && (
                <>
                  <div className={`mb-4 p-4 ${answerStyle.bg} border ${answerStyle.border} rounded-lg text-center`}>
                    <p className={`text-3xl font-bold ${answerStyle.color} mb-2`}>
                      {answer}
                    </p>
                    <p className="text-white/50 text-sm">
                      The ancient wisdom has spoken
                    </p>
                  </div>
                  
                  {/* Calculation Proof */}
                  <div className="mb-4 p-3 bg-black/50 border border-white/10 rounded-lg">
                    <p className="text-white/30 text-[10px] font-mono">
                      {calculation}
                    </p>
                    <p className="text-white/50 text-[10px] mt-1">
                      Deterministic numerology - same question = same answer
                    </p>
                  </div>
                </>
              )}

              {/* Loading State */}
              {isAsking && (
                <div className="mb-6 flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-10 h-10 text-[#FF9500] animate-spin mb-4" />
                  <p className="text-white/70 text-sm">Consulting the Tree of Life...</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!answer ? (
                  <button
                    onClick={handleAsk}
                    disabled={!question.trim() || isAsking}
                    className="flex-1 py-3 bg-gradient-to-r from-[#FF9500] to-orange-500 hover:from-[#FF9500]/80 hover:to-orange-400 text-black font-bold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAsking ? "Asking..." : "Ask"}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setQuestion("")
                        setAnswer(null)
                        setCalculation("")
                      }}
                      className="flex-1 py-3 border border-[#FF9500]/30 text-white hover:bg-[#FF9500]/10 font-bold uppercase tracking-wide transition-colors"
                    >
                      Ask Again
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex-1 py-3 bg-gradient-to-r from-[#FF9500] to-orange-500 hover:from-[#FF9500]/80 hover:to-orange-400 text-black font-bold uppercase tracking-wide transition-colors"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
