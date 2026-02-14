"use client"

import { AnimatedSection } from "@/components/ui/animated-section"
import { Calculator, BookOpen, Users, Hexagon, Calendar, TrendingUp } from "lucide-react"

export function SolutionSection() {
  const features = [
    {
      icon: <Calculator className="w-10 h-10" />,
      title: "Soul Numerology",
      desc: "EVM wallet + Twitter = your unique cosmic signature",
    },
    {
      icon: <BookOpen className="w-10 h-10" />,
      title: "Ancient Texts",
      desc: "Sefer Yetzirah, Zohar, and ARI teachings",
    },
    { icon: <Users className="w-10 h-10" />, title: "Sacred Community", desc: "Connect with seekers on the mystical path" },
    { icon: <Hexagon className="w-10 h-10" />, title: "Mystical NFTs", desc: "On-chain proof of spiritual mastery" },
    {
      icon: <Calendar className="w-10 h-10" />,
      title: "Daily Rituals",
      desc: "Guidance across 12 sacred life domains",
    },
    {
      icon: <TrendingUp className="w-10 h-10" />,
      title: "Ascension Path",
      desc: "Unlock deeper mysteries at each level",
    },
  ]

  return (
    <AnimatedSection id="solution" className="py-24 md:py-32 px-4 bg-gradient-to-b from-black/20 to-gray-900/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold">
            <span className="text-white drop-shadow-lg">Your Sacred </span>
            <span className="text-[#FF9500] drop-shadow-lg">Oracle Awaits</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group relative p-8 bg-gradient-to-br from-black/30 to-gray-900/30 backdrop-blur-sm border-2 border-[#FF9500]/30 hover:border-[#FF9500]/70 transition-all duration-300 hover:-translate-y-1 rounded-xl overflow-hidden"
            >
              {/* Decorative corners */}
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#FF9500]/50" />
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#FF9500]/50" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#FF9500]/50" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#FF9500]/50" />
              
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF9500]/5 via-orange-500/5 to-[#FF9500]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <div className="text-[#FF9500] mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 font-serif">{feature.title}</h3>
                <p className="text-white/70">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  )
}
