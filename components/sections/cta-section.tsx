"use client"

import { AnimatedSection } from "@/components/ui/animated-section"
import { Crown, ExternalLink } from "lucide-react"
import Image from "next/image"

interface CtaSectionProps {
  onConnectClick: () => void
}

export function CtaSection({ onConnectClick }: CtaSectionProps) {
  return (
    <AnimatedSection className="py-24 md:py-32 px-4 bg-gradient-to-b from-gray-900/30 to-black">
      <div className="max-w-4xl mx-auto px-2 md:px-4">
        {/* Ornate CTA frame */}
        <div className="relative px-2 md:px-6">
          {/* Orange glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-[#FF9500]/20 via-orange-500/30 to-[#FF9500]/20 rounded-3xl blur-2xl" />
          
          <div className="relative border-2 border-[#FF9500]/50 bg-gradient-to-br from-black/50 to-gray-900/50 backdrop-blur-sm p-6 md:p-16 text-center rounded-2xl overflow-hidden">
            {/* Decorative corners */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[#FF9500]/70" />
            <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[#FF9500]/70" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[#FF9500]/70" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[#FF9500]/70" />

            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-8 left-8 w-6 h-6 border border-[#FF9500] rotate-45" />
              <div className="absolute top-8 right-8 w-6 h-6 border border-[#FF9500] rotate-45" />
              <div className="absolute bottom-8 left-8 w-6 h-6 border border-[#FF9500] rotate-45" />
              <div className="absolute bottom-8 right-8 w-6 h-6 border border-[#FF9500] rotate-45" />
            </div>

            <div className="relative z-10">
              <div className="text-[#FF9500] mx-auto mb-8">
                <Crown className="w-16 h-16 md:w-20 md:h-20 mx-auto drop-shadow-lg" />
              </div>

              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-[#FF9500] drop-shadow-lg">Begin Your </span>
                <span className="text-white drop-shadow-lg">Mystical Journey</span>
              </h2>

              <p className="text-white/70 text-lg md:text-xl mb-10 max-w-xl mx-auto">
                Unlock ancient wisdom through blockchain and sacred numerology
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {/* Mystical Enter Button */}
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-[#FF9500] via-orange-500 to-[#FF9500] rounded-xl opacity-75 blur-sm animate-pulse" />
                  <button
                    onClick={onConnectClick}
                    className="relative px-6 sm:px-10 py-3 sm:py-5 bg-gradient-to-r from-[#FF9500] to-orange-500 hover:from-[#FF9500]/80 hover:to-orange-400 text-black font-bold text-base sm:text-lg uppercase tracking-wide transition-all duration-300 transform hover:scale-105 rounded-xl border border-[#FF9500]/50 whitespace-nowrap"
                  >
                    Enter the Temple
                  </button>
                </div>

                <a
                  href="https://twitter.com/KabbalahCode"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 sm:px-10 py-3 sm:py-5 border-2 border-[#FF9500] text-[#FF9500] font-bold text-base sm:text-lg uppercase tracking-wide hover:bg-[#FF9500]/10 transition-colors flex items-center justify-center gap-2 rounded-xl whitespace-nowrap"
                >
                  Join Twitter
                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-16 text-center">
          <div className="flex items-center justify-center mb-6">
            <Image 
              src="/logo.png" 
              alt="Kabbalah Code" 
              width={200} 
              height={56}
              className="h-10 md:h-12 w-auto"
            />
          </div>
          
          {/* Social Links */}
          <div className="flex justify-center gap-6 mb-6">
            <a
              href="https://t.me/kabbalah_code"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[#0088cc]/20 border border-[#0088cc]/50 text-[#0088cc] hover:bg-[#0088cc]/30 transition-colors rounded-lg font-semibold"
            >
              Join Telegram
            </a>
            <a
              href="https://x.com/KabbalahCode"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-white/10 border border-white/30 text-white hover:bg-white/20 transition-colors rounded-lg font-semibold"
            >
              Follow on X
            </a>
          </div>
          
          <p className="text-white/50 text-sm">&copy; 2026 Kabbalah Code. All rights reserved.</p>
        </footer>
      </div>
    </AnimatedSection>
  )
}
