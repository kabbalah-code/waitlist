"use client"

import { useState, useEffect } from "react"
import { WHEEL_REWARDS, POINTS_CONFIG } from "@/lib/points/calculator"
import { spinWheel } from "@/lib/api/client"
import { purchaseWheelSpin, canPurchaseWheelSpin } from "@/lib/web3/wheel-purchase"
import { Gift, Sparkles, Loader2, Zap, TrendingUp, Wallet } from "lucide-react"

interface WheelOfFortuneProps {
  walletAddress: string
  freeSpinsAvailable: number
  availableKcode: number // Database KCODE balance
  activeMultiplier?: number
  activeBoost?: number
  onSpinComplete: (reward: (typeof WHEEL_REWARDS)[number], kcodeChange: number, newFreeSpins: number, tokensAwarded?: number, transactionHash?: string, alternativeReward?: any) => void
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info') => void
}

interface WheelState {
  localFreeSpins: number
}

export function WheelOfFortune({
  walletAddress,
  freeSpinsAvailable,
  availableKcode,
  activeMultiplier = 1,
  activeBoost = 0,
  onSpinComplete,
  onShowNotification,
}: WheelOfFortuneProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [result, setResult] = useState<(typeof WHEEL_REWARDS)[number] | null>(null)
  const [alternativeReward, setAlternativeReward] = useState<any>(null)
  const [maxSupplyReached, setMaxSupplyReached] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [kcodeBalance, setKcodeBalance] = useState<number>(0)
  const [canPurchase, setCanPurchase] = useState(false)
  const [floatingSymbols, setFloatingSymbols] = useState<Array<{id: number, symbol: string, top: number, left: number, size: number, opacity: number}>>([])
  const [energies, setEnergies] = useState<Array<{id: number, x: number, y: number, size: number}>>([])
  
  // Локальное состояние для немедленного обновления UI
  const [localFreeSpins, setLocalFreeSpins] = useState(freeSpinsAvailable)

  // Синхронизируем локальное состояние с props
  useEffect(() => {
    setLocalFreeSpins(freeSpinsAvailable)
  }, [freeSpinsAvailable])

  // Check blockchain purchase ability
  useEffect(() => {
    const checkPurchaseAbility = async () => {
      try {
        const result = await canPurchaseWheelSpin()
        setKcodeBalance(result.kcodeBalance)
        setCanPurchase(result.canPurchase)
      } catch (error) {
        // Silently fail - MetaMask might not be connected to Polygon Amoy
        // This only affects the "buy spin with MetaMask" feature
        // Free spins still work via backend
        console.log("[Wheel] MetaMask not available or not connected to Polygon Amoy")
        setCanPurchase(false)
        setKcodeBalance(0)
      }
    }

    checkPurchaseAbility()
  }, [])

  const canBuySpin = availableKcode >= POINTS_CONFIG.EXTRA_SPIN_COST
  const hasActiveBoosters = activeMultiplier > 1 || activeBoost > 0

  // Mystical symbol set
  const mysticalSymbolSet = ['✦', '✧', '★', '☆', '✺', '✹', '✷', '✶', '※', '₊', '⚡', '✨', '☀', '✼', '♽', '☽', '☾', '☌', '☍', '♓', '♕', '♖', '♗', '♘', '♙']
  
  // Initialize floating symbols
  useEffect(() => {
    const symbols = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      symbol: mysticalSymbolSet[Math.floor(Math.random() * mysticalSymbolSet.length)],
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 20 + 10,
      opacity: Math.random() * 0.8 + 0.2
    }))
    setFloatingSymbols(symbols)
    
    const energyPoints = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 8 + 4
    }))
    setEnergies(energyPoints)
  }, [])

  const handlePurchaseSpin = async () => {
    if (isPurchasing) return

    setIsPurchasing(true)

    try {
      console.log("[Wheel] Purchasing spin with blockchain...")
      const result = await purchaseWheelSpin()

      if (!result.success) {
        throw new Error(result.error)
      }

      console.log("[Wheel] Spin purchased successfully:", result)
      
      // Update local state
      setLocalFreeSpins(result.newFreeSpins || localFreeSpins + 1)
      
      // Show success notification
      if (onShowNotification) {
        onShowNotification(
          `✅ Spin purchased! ${result.tokensSpent} KCODE spent. You now have ${result.newFreeSpins} free spins!`,
          'success'
        )
      }

    } catch (error) {
      console.error("[Wheel] Purchase error:", error)
      if (onShowNotification) {
        onShowNotification(
          `❌ Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'error'
        )
      }
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleSpin = async (useFree: boolean) => {
    if (isSpinning) return
    if (useFree && localFreeSpins <= 0) return
    if (!useFree && !canBuySpin) return

    setIsSpinning(true)
    setResult(null)
    setShowHint(false)

    try {
      // ✅ Используем API client (автоматически передаёт credentials)
      console.log("[Wheel] Spinning wheel, useFree:", useFree)
      const data = await spinWheel(useFree)
      
      console.log("[Wheel] API response:", data)

      if (!data || !data.success) {
        const errorMessage = data?.error || "Unknown error occurred"
        console.error("[Wheel] API call failed:", errorMessage)
        throw new Error(errorMessage)
      }

      // Add more energy effects during spin
      const energyBurst = Array.from({ length: 20 }, (_, i) => ({
        id: i + 100,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 12 + 6
      }))
      setEnergies(prev => [...prev, ...energyBurst])

      setTimeout(() => {
        // Handle both direct response and nested data response formats
        // TypeScript-safe property access
        const apiData = data as any // Cast to any to handle both response formats
        const reward = apiData.reward || apiData.data?.reward
        const kcodeChange = apiData.kcodeChange !== undefined ? apiData.kcodeChange : (apiData.data?.kcodeChange || 0)
        const freeSpins = apiData.freeSpins !== undefined ? apiData.freeSpins : (apiData.data?.freeSpins || 0)
        const tokensAwarded = apiData.tokensAwarded || apiData.data?.tokensAwarded || 0
        const transactionHash = apiData.transactionHash || apiData.data?.transactionHash || ""
        const alternativeRewardData = apiData.alternativeReward || apiData.data?.alternativeReward || null
        const maxSupplyReachedData = apiData.maxSupplyReached || apiData.data?.maxSupplyReached || false
        
        console.log("[Wheel] Parsed API response:", {
          reward,
          kcodeChange,
          freeSpins,
          tokensAwarded,
          transactionHash
        })
        
        if (!reward) {
          console.error("[Wheel] Invalid API response - no reward data:", data)
          throw new Error("Invalid response from server")
        }
        
        // Немедленно обновляем локальное состояние free spins
        console.log("[Wheel] Updating local free spins:", freeSpins)
        setLocalFreeSpins(freeSpins)
        
        setResult(reward)
        setAlternativeReward(alternativeRewardData)
        setMaxSupplyReached(maxSupplyReachedData)
        setIsSpinning(false)
        
        // Вызываем callback с обновленными данными
        console.log("[Wheel] Calling onSpinComplete callback...")
        onSpinComplete(
          reward, 
          kcodeChange, 
          freeSpins,
          tokensAwarded,
          transactionHash,
          alternativeRewardData
        )
        
        // Clean up energy effects after result
        setTimeout(() => {
          setEnergies(prev => prev.filter(e => e.id < 100))
        }, 2000)
      }, 4000)
    } catch (error) {
      console.error("[Mystical Wheel] Spin error:", error)
      setIsSpinning(false)
    }
  }

  return (
    <div className="p-6 border border-purple-500/30 bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent"></div>
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h2 className="text-xl font-bold text-white font-serif">Wheel of Fortune</h2>
        <div className="flex items-center gap-2 text-purple-300 text-sm">
          <Gift className="w-4 h-4 text-purple-400" />
          <span>
            {localFreeSpins} free {localFreeSpins === 1 ? "spin" : "spins"}
          </span>
        </div>
      </div>

      {hasActiveBoosters && (
        <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 flex items-center gap-4 text-sm rounded-lg relative z-10">
          {activeMultiplier > 1 && (
            <div className="flex items-center gap-1 text-purple-300">
              <Zap size={16} />
              <span>x{activeMultiplier} Active</span>
            </div>
          )}
          {activeBoost > 0 && (
            <div className="flex items-center gap-1 text-purple-300">
              <TrendingUp size={16} />
              <span>+{activeBoost}% Boost</span>
            </div>
          )}
        </div>
      )}

      {/* Mystical Animation Container */}
      <div className="relative w-full h-80 mx-auto mb-6 rounded-xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-black overflow-hidden">
        {/* Background mystical effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(139,_92,_246,_0.3)_0%,_transparent_70%)] animate-pulse" 
             style={{ animationDuration: '4s' }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_rgba(168,_85,_247,_0.4)_0%,_transparent_50%)] animate-pulse" 
             style={{ animationDuration: '6s', animationDelay: '1s' }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_rgba(192,_132,_252,_0.4)_0%,_transparent_50%)] animate-pulse" 
             style={{ animationDuration: '8s', animationDelay: '2s' }}></div>
        
        {/* Floating mystical symbols */}
        {floatingSymbols.map((symbol) => (
          <div 
            key={symbol.id}
            className="absolute text-purple-400/60 animate-float"
            style={{
              top: `${symbol.top}%`,
              left: `${symbol.left}%`,
              fontSize: `${symbol.size}px`,
              opacity: symbol.opacity,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          >
            {symbol.symbol}
          </div>
        ))}
        
        {/* Energy points during spin */}
        {isSpinning && energies.map((energy) => (
          <div 
            key={energy.id}
            className="absolute rounded-full bg-purple-400 animate-ping"
            style={{
              top: `${energy.y}%`,
              left: `${energy.x}%`,
              width: `${energy.size}px`,
              height: `${energy.size}px`,
              opacity: 0.7,
              animationDuration: '1.5s'
            }}
          />
        ))}
        
        {/* Main mystical text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          {isSpinning ? (
            <>
              <div className="text-4xl md:text-5xl font-serif text-purple-300 mb-4 animate-pulse">
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i} className="inline-block mx-1" style={{ animationDelay: `${i * 0.1}s` }}>
                    {Math.floor(Math.random() * 10)}
                  </span>
                ))}
              </div>
              <p className="text-purple-400 text-lg md:text-xl font-serif italic animate-pulse">
                Numbers decide your fate...
              </p>
            </>
          ) : (
            <>
              <p className="text-purple-300 text-2xl md:text-3xl font-serif italic mb-2 text-center px-4">
                Numbers decide your fate
              </p>
              <p className="text-purple-400/70 text-sm md:text-base text-center px-4">
                Click to find out your fate
              </p>
            </>
          )}
        </div>
      </div>

      {/* Mystical Hint */}
      <div 
        className="text-center mb-4 cursor-pointer transition-all duration-300 relative z-10"
        onClick={() => setShowHint(!showHint)}
      >
        <p className="text-purple-400 text-sm flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          What can you win?
          <span className="text-[10px] text-purple-500/50">(click)</span>
        </p>
        {showHint && (
          <div className="mt-3 p-4 bg-purple-900/50 border border-purple-500/40 rounded-lg text-sm text-purple-200 backdrop-blur-sm text-left">
            <p className="font-bold mb-2 text-purple-300">Possible rewards:</p>
            <ul className="space-y-1.5">
              <li>• <span className="text-[#FF9500]">0.1-1.5 KCODE</span></li>
              <li>• <span className="text-[#FF9500]">x2 multiplier</span> for next ritual (24h)</li>
              <li>• <span className="text-[#FF9500]">+10% boost</span> on all rewards (24h)</li>
              <li>• <span className="text-[#FFD700]">Jackpot 5 KCODE!</span></li>
            </ul>
          </div>
        )}
      </div>

      {/* Result Display */}
      {result && !isSpinning && (
        <div className="text-center mb-6 p-4 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-lg backdrop-blur-sm relative z-10">
          <p className="text-purple-300 text-sm mb-1">You win:</p>
          <p className="text-[#FF9500] text-2xl font-bold">{result.label}</p>
          {result.type === "pol" && (
            <p className="text-purple-300 text-sm mt-1">🎉 POL will be sent to your wallet on Polygon Mainnet!</p>
          )}
          {result.type === "multiplier" && (
            <p className="text-purple-300 text-sm mt-1">The rewards for the next ritual are doubled!</p>
          )}
          {result.type === "boost" && (
            <p className="text-purple-300 text-sm mt-1">+10% to all points for 24 hours!</p>
          )}
        </div>
      )}

      {/* Alternative Reward Display */}
      {alternativeReward && maxSupplyReached && !isSpinning && (
        <div className="text-center mb-6 p-4 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-lg backdrop-blur-sm relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 font-bold">MAX SUPPLY Reached!</span>
          </div>
          <p className="text-white/70 text-sm mb-3">
            Token supply exhausted. You've received an exclusive alternative reward:
          </p>
          <div className="bg-black/50 p-3 border border-purple-500/20 rounded">
            <div className="flex items-center justify-center gap-2 mb-1">
              {alternativeReward.type === 'nft' && <span className="text-2xl">🎨</span>}
              {alternativeReward.type === 'achievement' && <span className="text-2xl">🏆</span>}
              {alternativeReward.type === 'premium' && <span className="text-2xl">🌟</span>}
              <span className="text-white font-bold capitalize">{alternativeReward.type} Reward</span>
            </div>
            <p className="text-purple-300 text-sm">{alternativeReward.message}</p>
            {alternativeReward.reward?.name && (
              <p className="text-white/50 text-xs mt-1">{alternativeReward.reward.name}</p>
            )}
          </div>
        </div>
      )}

      {/* Spin buttons */}
      <div className="space-y-3 relative z-10">
        {localFreeSpins > 0 ? (
          <button
            onClick={() => handleSpin(true)}
            disabled={isSpinning}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold uppercase tracking-wide hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 rounded-lg"
          >
            {isSpinning ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Spinning...
              </div>
            ) : (
              "🎯 Free Spin Available!"
            )}
          </button>
        ) : (
          <div className="space-y-2">
            {/* Blockchain Purchase Button */}
            <button
              onClick={handlePurchaseSpin}
              disabled={isPurchasing || !canPurchase}
              className="w-full py-4 bg-gradient-to-r from-orange-600 to-yellow-600 text-white font-bold uppercase tracking-wide hover:from-orange-500 hover:to-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 rounded-lg"
            >
              {isPurchasing ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Purchasing...
                </div>
              ) : canPurchase ? (
                <div className="flex items-center justify-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Buy Spin for {POINTS_CONFIG.EXTRA_SPIN_COST} KCODE
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Need {POINTS_CONFIG.EXTRA_SPIN_COST} KCODE + Gas
                </div>
              )}
            </button>
            
            {/* Balance Info */}
            <div className="text-center text-sm text-purple-400/70">
              💰 Your KCODE: {kcodeBalance.toFixed(2)} | Required: {POINTS_CONFIG.EXTRA_SPIN_COST}
            </div>
          </div>
        )}
        
        {localFreeSpins === 0 && (
          <p className="text-center text-purple-400/60 text-sm">
            💫 Earn free spins by completing daily rituals or buy with KCODE tokens
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-15px) rotate(10deg); opacity: 0.8; }
          100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}