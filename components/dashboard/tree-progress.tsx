"use client"

import { calculateLevel, getKcodeForLevel } from "@/lib/points/calculator"
import { Crown, Brain, Eye, Heart, Shield, Sun, Zap, Sparkles, Circle, Home } from "lucide-react"

interface TreeProgressProps {
  totalPoints: number
  unlockedSephirot: number[]
}

const SEPHIROT_DATA = [
  { id: 1, name: "Malkuth", icon: Home, required_level: 1, description: "Kingdom - Foundation" },
  { id: 2, name: "Yesod", icon: Circle, required_level: 10, description: "Foundation - Connection" },
  { id: 3, name: "Hod", icon: Sparkles, required_level: 20, description: "Glory - Intellect" },
  { id: 4, name: "Netzach", icon: Zap, required_level: 30, description: "Victory - Emotions" },
  { id: 5, name: "Tiphereth", icon: Sun, required_level: 40, description: "Beauty - Harmony" },
  { id: 6, name: "Gevurah", icon: Shield, required_level: 50, description: "Strength - Judgment" },
  { id: 7, name: "Chesed", icon: Heart, required_level: 60, description: "Mercy - Kindness" },
  { id: 8, name: "Binah", icon: Eye, required_level: 65, description: "Understanding - Insight" },
  { id: 9, name: "Chokmah", icon: Brain, required_level: 70, description: "Wisdom - Creativity" },
  { id: 10, name: "Kether", icon: Crown, required_level: 75, description: "Crown - Unity" },
]

export function TreeProgress({ totalPoints, unlockedSephirot }: TreeProgressProps) {
  // totalPoints уже в KCODE (конвертировано в dashboard)
  const totalKcode = totalPoints
  const currentLevel = calculateLevel(totalKcode)
  const currentLevelKcode = getKcodeForLevel(currentLevel)
  const nextLevelKcode = getKcodeForLevel(currentLevel + 1)
  const kcodeInLevel = totalKcode - currentLevelKcode
  const kcodeNeeded = nextLevelKcode - currentLevelKcode
  const progress = kcodeNeeded > 0 ? Math.min((kcodeInLevel / kcodeNeeded) * 100, 100) : 100

  const sephirot = SEPHIROT_DATA.map((s) => ({
    ...s,
    unlocked: unlockedSephirot.includes(s.id) || currentLevel >= s.required_level,
  }))

  const unlockedCount = sephirot.filter((s) => s.unlocked).length

  return (
    <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white font-serif">Tree of Life</h2>
        <span className="text-white/50 text-sm">{unlockedCount}/10 Sephirot</span>
      </div>

      {/* Level progress */}
      <div className="mb-6 p-4 bg-black/50 border border-[#FF9500]/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#FF9500] font-bold">Level {currentLevel}</span>
          <span className="text-white/50 text-sm">
            {kcodeInLevel.toFixed(1)} / {kcodeNeeded.toFixed(1)} KCODE
          </span>
        </div>
        <div className="h-3 bg-black/80 overflow-hidden border border-[#FF9500]/20">
          <div
            className="h-full bg-gradient-to-r from-[#FF9500] to-[#FFB340] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-white/40 text-xs mt-2 text-center">
          {Math.round(progress)}% to Level {currentLevel + 1}
        </p>
      </div>

      {/* Sephirot grid - 2 rows of 5 */}
      <div className="grid grid-cols-5 gap-2">
        {sephirot.map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.id}
              className={`relative aspect-square flex flex-col items-center justify-center p-2 border transition-all group cursor-help ${
                s.unlocked ? "border-[#FF9500] bg-[#FF9500]/10" : "border-white/10 bg-black/50 opacity-40"
              }`}
              title={`${s.name} - ${s.description}\nLevel ${s.required_level} required`}
            >
              <Icon className={`w-6 h-6 ${s.unlocked ? "text-[#FF9500]" : "text-white/30"}`} />
              <span className="text-[9px] text-white/50 mt-1 truncate w-full text-center">{s.name.slice(0, 4)}</span>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-[#FF9500]/30 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <p className="text-white font-medium">{s.name}</p>
                <p className="text-white/50">Lvl {s.required_level}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
