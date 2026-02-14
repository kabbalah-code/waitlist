"use client"

import { AnimatedSection } from "@/components/ui/animated-section"

export function RoadmapSection() {
  const phases = [
    {
      phase: "Genesis",
      title: "Q1 2026",
      items: ["Waitlist Launch", "Community Building", "Testnet NFTs"],
      active: true,
    },
    { phase: "Expansion", title: "Q2 2026", items: ["Platform Launch", "Daily Rituals", "Sephirot System"] },
    { phase: "Evolution", title: "Q3 2026", items: ["$KCODE Token", "Advanced Features", "Mobile App"] },
    { phase: "Ascension", title: "Q4 2026", items: ["DAO Governance", "Cross-chain", "Global Expansion"] },
  ]

  return (
    <AnimatedSection id="roadmap" className="py-24 md:py-32 px-4 bg-gradient-to-b from-black/20 to-gray-900/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold">
            <span className="text-white drop-shadow-lg">The Prophetic </span>
            <span className="text-[#FF9500] drop-shadow-lg">Timeline</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {phases.map((phase, i) => (
            <div
              key={i}
              className={`relative p-6 md:p-8 bg-gradient-to-br from-black/30 to-gray-900/30 backdrop-blur-sm border-2 transition-all duration-300 hover:-translate-y-1 rounded-xl overflow-hidden ${
                phase.active
                  ? "border-[#FF9500] shadow-[0_0_30px_rgba(255,149,0,0.3)]"
                  : "border-[#FF9500]/30 hover:border-[#FF9500]/70"
              }`}
            >
              {/* Decorative corners */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#FF9500]/50" />
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#FF9500]/50" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#FF9500]/50" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#FF9500]/50" />
              
              {/* Active glow effect */}
              {phase.active && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF9500]/10 via-orange-500/10 to-[#FF9500]/10 animate-pulse" />
              )}
              
              <div className="relative z-10">
                <div
                  className={`text-xs font-bold mb-3 uppercase tracking-wider ${phase.active ? "text-[#FF9500]" : "text-[#FF9500]/60"}`}
                >
                  {phase.phase}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 font-serif">{phase.title}</h3>
                <ul className="space-y-3">
                  {phase.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-3 text-white/70">
                      <div className={`w-1.5 h-1.5 rounded-full ${phase.active ? "bg-[#FF9500]" : "bg-[#FF9500]/40"}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  )
}
