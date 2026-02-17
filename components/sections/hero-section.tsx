"use client"

import { ChevronDown, Users, Zap, Crown } from "lucide-react"
import { TreeOfLife } from "@/components/ui/tree-of-life"

interface HeroSectionProps {
  onConnectClick: () => void
}

export function HeroSection({ onConnectClick }: HeroSectionProps) {
  const isWaitlistEnabled = process.env.NEXT_PUBLIC_WAITLIST_ENABLED === 'true'

  const scrollToNext = () => {
    document.querySelector("#problem")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Mystical background overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/50" />

      {/* Tree of Life background with mystical glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full max-w-lg h-[600px] relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF9500]/10 via-orange-400/10 to-[#FF9500]/10 rounded-full blur-3xl animate-pulse" />
          <TreeOfLife />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto pt-20 px-4">
        {/* Ornate title frame */}
        <div className="relative mb-8 px-8">
          {/* Orange ornate border around title */}
          <div className="absolute -inset-4 bg-gradient-to-r from-[#FF9500]/20 via-orange-500/30 to-[#FF9500]/20 rounded-3xl blur-xl" />
          <div className="relative">
            {/* Decorative corners */}
            <div className="absolute -top-4 -left-4 w-8 h-8 border-l-2 border-t-2 border-[#FF9500]/70" />
            <div className="absolute -top-4 -right-4 w-8 h-8 border-r-2 border-t-2 border-[#FF9500]/70" />
            <div className="absolute -bottom-4 -left-4 w-8 h-8 border-l-2 border-b-2 border-[#FF9500]/70" />
            <div className="absolute -bottom-4 -right-4 w-8 h-8 border-r-2 border-b-2 border-[#FF9500]/70" />
            
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
              <span className="text-[#FF9500] drop-shadow-2xl block" style={{ textShadow: '0 0 30px rgba(255, 149, 0, 0.6)' }}>
                KABBALAH
              </span>
              <span className="text-white block mt-2 drop-shadow-xl">CODE</span>
            </h1>
          </div>
        </div>

        <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Daily mystical predictions powered by sacred Kabbalah numerology, your unique Web3 soul signature, and the
          eternal Tree of Life.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          {/* Primary Action Button */}
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#FF9500] via-orange-500 to-[#FF9500] rounded-xl opacity-75 blur-sm animate-pulse" />
            <button
              onClick={onConnectClick}
              className="relative group px-8 py-4 bg-gradient-to-r from-[#FF9500] to-orange-500 hover:from-[#FF9500]/80 hover:to-orange-400 text-black font-bold text-lg uppercase tracking-wide transition-all duration-300 transform hover:scale-105 rounded-xl border border-[#FF9500]/50"
            >
              <span className="flex items-center gap-2">
                {isWaitlistEnabled ? 'Join Waitlist' : 'Connect Wallet'}
                <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </span>
            </button>
          </div>

          <a
            href="https://twitter.com/KabbalahCode"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border-2 border-[#FF9500] text-[#FF9500] font-bold text-lg uppercase tracking-wide hover:bg-[#FF9500]/10 transition-colors rounded-xl"
          >
            Join Twitter
          </a>
        </div>

        {/* Stats with mystical styling */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          <div className="flex items-center gap-2 bg-black/30 rounded-full px-4 py-2 border border-[#FF9500]/30">
            <Users className="w-5 h-5 text-[#FF9500]" />
            <span className="font-semibold text-white/70">Pre-Launch Phase</span>
          </div>
          <div className="flex items-center gap-2 bg-black/30 rounded-full px-4 py-2 border border-[#FF9500]/30">
            <Zap className="w-5 h-5 text-[#FF9500]" />
            <span className="font-semibold text-white/70">Earn $KCODE</span>
          </div>
          <div className="flex items-center gap-2 bg-black/30 rounded-full px-4 py-2 border border-[#FF9500]/30">
            <Crown className="w-5 h-5 text-[#FF9500]" />
            <span className="font-semibold text-white/70">Sacred NFTs</span>
          </div>
        </div>
      </div>

      <button
        onClick={scrollToNext}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[#FF9500]/70 hover:text-[#FF9500] transition-colors animate-bounce"
        aria-label="Scroll to next section"
      >
        <ChevronDown size={32} />
      </button>
    </section>
  )
}
