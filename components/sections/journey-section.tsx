"use client"

import { AnimatedSection } from "@/components/ui/animated-section"

export function JourneySection() {
  const steps = [
    { num: "01", title: "Bind Your Soul", desc: "Connect wallet & Twitter for divine calculation" },
    { num: "02", title: "Receive Prophecy", desc: "Daily visions from the Tree of Life" },
    { num: "03", title: "Share the Word", desc: "Spread wisdom on X with sacred codes" },
    { num: "04", title: "Ascend Higher", desc: "Unlock Sephirot, Sacred Domains, and Ancient Wisdom" },
    { num: "05", title: "Claim Glory", desc: "Mint eternal proof of your journey" },
  ]

  return (
    <AnimatedSection id="journey" className="py-24 md:py-32 px-4 bg-gradient-to-b from-gray-900/30 to-black/20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold">
            <span className="text-[#FF9500] drop-shadow-lg">The Path of </span>
            <span className="text-white drop-shadow-lg">Illumination</span>
          </h2>
        </div>

        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex items-stretch gap-4 md:gap-8 group">
              {/* Mystical step number */}
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#FF9500] to-orange-500 rounded-xl opacity-50 blur group-hover:opacity-75 transition-opacity" />
                <div className="relative w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-[#FF9500] to-orange-500 flex items-center justify-center text-black font-bold text-xl md:text-2xl font-serif group-hover:scale-105 transition-transform rounded-xl border border-[#FF9500]/50">
                  {step.num}
                </div>
              </div>
              
              {/* Content card */}
              <div className="relative flex-1 p-6 md:p-8 bg-gradient-to-br from-black/30 to-gray-900/30 backdrop-blur-sm border-2 border-[#FF9500]/30 group-hover:border-[#FF9500]/70 transition-all duration-300 rounded-xl overflow-hidden">
                {/* Decorative corners */}
                <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#FF9500]/50" />
                <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#FF9500]/50" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#FF9500]/50" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#FF9500]/50" />
                
                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF9500]/5 via-orange-500/5 to-[#FF9500]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative z-10">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2 font-serif">{step.title}</h3>
                  <p className="text-white/70">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  )
}
