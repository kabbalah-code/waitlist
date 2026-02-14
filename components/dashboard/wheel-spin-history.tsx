"use client"

import { useState, useEffect } from 'react'
import { Gift, TrendingUp, Zap, Clock } from 'lucide-react'
import { apiCall } from '@/lib/api/authenticated-fetch'

interface WheelSpin {
  id: string
  reward_type: string
  reward_value: number
  tokens_minted: number
  transaction_hash: string | null
  is_free: boolean
  created_at: string
}

interface WheelSpinHistoryProps {
  walletAddress: string
}

export function WheelSpinHistory({ walletAddress }: WheelSpinHistoryProps) {
  const [spins, setSpins] = useState<WheelSpin[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (walletAddress) {
      loadSpinHistory()
    }
  }, [walletAddress])

  const loadSpinHistory = async () => {
    setLoading(true)
    try {
      const response = await apiCall('/api/wheel/history')
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.spins) {
          setSpins(data.spins)
        }
      }
    } catch (error) {
      console.error('[WheelSpinHistory] Error loading spin history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'kcode':
      case 'jackpot':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'pol':
        return <TrendingUp className="w-4 h-4 text-purple-500" />
      case 'multiplier':
        return <Zap className="w-4 h-4 text-[#FF9500]" />
      case 'boost':
        return <TrendingUp className="w-4 h-4 text-[#FFB340]" />
      default:
        return <Gift className="w-4 h-4 text-gray-500" />
    }
  }

  const getRewardColor = (type: string) => {
    switch (type) {
      case 'kcode':
      case 'jackpot':
        return 'text-green-400'
      case 'pol':
        return 'text-purple-400'
      case 'multiplier':
        return 'text-[#FF9500]'
      case 'boost':
        return 'text-[#FFB340]'
      default:
        return 'text-gray-400'
    }
  }

  const formatReward = (type: string, value: number) => {
    // Value is stored as integer (0.5 KCODE = 50)
    const kcodeValue = value / 100
    
    switch (type) {
      case 'kcode':
        return `+${kcodeValue.toFixed(2)} KCODE`
      case 'pol':
        return `+${kcodeValue.toFixed(2)} POL 🎉`
      case 'jackpot':
        return `🎰 Jackpot +${kcodeValue.toFixed(2)} KCODE`
      case 'multiplier':
        return `x${kcodeValue.toFixed(0)} Multiplier`
      case 'boost':
        return `+${kcodeValue.toFixed(0)}% Boost`
      default:
        return `${type} ${kcodeValue.toFixed(2)}`
    }
  }

  if (!walletAddress) {
    return null
  }

  return (
    <div className="bg-[#0a0a0a] border border-[#FF9500]/20 p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#FF9500] flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Spin History
        </h3>
        <button
          onClick={loadSpinHistory}
          disabled={loading}
          className="text-white/50 hover:text-[#FF9500] transition-colors disabled:opacity-50"
          title="Refresh"
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {spins.length === 0 ? (
        <div className="text-center py-8 text-white/50">
          <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No spins yet</p>
          <p className="text-sm mt-1">Spin the wheel to see your history</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {spins.map((spin, index) => (
            <div
              key={spin.id || index}
              className="flex items-center justify-between p-3 bg-black/50 border border-[#FF9500]/10 hover:border-[#FF9500]/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                {getRewardIcon(spin.reward_type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${getRewardColor(spin.reward_type)}`}>
                      {formatReward(spin.reward_type, spin.reward_value)}
                    </span>
                    {spin.is_free && (
                      <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 border border-blue-500/20">
                        FREE
                      </span>
                    )}
                    {spin.tokens_minted > 0 && (
                      <span className="text-xs text-green-400">
                        ✓ Minted
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(spin.created_at).toLocaleString()}</span>
                    {spin.transaction_hash && (
                      <>
                        <span>•</span>
                        <a
                          href={`https://amoy.polygonscan.com/tx/${spin.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#FF9500] hover:underline flex items-center gap-1"
                          title="View on Polygon Amoy Explorer"
                        >
                          TX: {spin.transaction_hash.slice(0, 8)}...
                          <span className="text-xs">↗</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
