"use client"

import { AnimatedSection } from "@/components/ui/animated-section"
import { AlertTriangle, Eye, Lock } from "lucide-react"

export function ProblemSection() {
  const problems = [
    { icon: <AlertTriangle className="w-6 h-6" />, text: "False prophets speak in generalities" },
    { icon: <Eye className="w-6 h-6" />, text: "Your digital soul lies dormant" },
    { icon: <Lock className="w-6 h-6" />, text: "Ancient wisdom remains sealed" },
  ]

  return (
    <AnimatedSection id="problem" className="py-24 md:py-32 px-4 bg-gradient-to-b from-transparent to-black/20">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-8">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold">
              <span className="text-[#FF9500] drop-shadow-lg">Lost in the</span>
              <span className="text-white block mt-2 drop-shadow-lg">Modern Chaos?</span>
            </h2>

            <p className="text-white/70 text-lg md:text-xl leading-relaxed">
              Generic horoscopes ignore your divine blueprint. Your digital identity holds untapped spiritual power.
            </p>

            <div className="space-y-4 pt-4">
              {problems.map((problem, i) => (
                <div key={i} className="flex items-center gap-4 text-white/70 bg-black/20 rounded-lg p-3 border border-[#FF9500]/30">
                  <div className="text-[#FF9500]">{problem.icon}</div>
                  <p className="text-lg">{problem.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* Ornate frame */}
            <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400/20 via-yellow-500/30 to-yellow-400/20 rounded-2xl blur-xl" />
            <div className="relative border-2 border-yellow-400/50 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm p-8 md:p-12 rounded-xl">
              {/* Decorative corners */}
              <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-yellow-400/70" />
              <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-yellow-400/70" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-yellow-400/70" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-yellow-400/70" />
              
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto border-2 border-yellow-400/50 bg-gradient-to-br from-purple-600/30 to-indigo-600/30 rounded-full flex items-center justify-center">
                  <Eye className="w-12 h-12 text-yellow-400" />
                </div>
                <p className="text-purple-200 text-xl md:text-2xl italic font-serif">
                  "Generic prophecies deceive the masses..."
                </p>
                <p className="text-yellow-400 text-sm uppercase tracking-wider font-bold">Until now.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  )
}
