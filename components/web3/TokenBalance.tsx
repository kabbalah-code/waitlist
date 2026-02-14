"use client"

import { useState, useEffect } from 'react'
import { Coins, TrendingUp, Zap, Plus } from 'lucide-react'
import { contractService, formatTokenAmount } from '@/lib/web3/contracts'

interface TokenBalanceProps {
  walletAddress: string
}

interface BalanceData {
  tokenBalance: string
  pendingRewards: string
}

export function TokenBalance({ walletAddress }: TokenBalanceProps) {
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBalance()
  }, [walletAddress])

  const fetchBalance = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch from API endpoint
      const response = await fetch('/api/web3/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch balance')
      }

      const result = await response.json()
      setBalanceData(result.data)

    } catch (err) {
      console.error('Error fetching balance:', err)
      setError('Failed to load balance')
    } finally {
      setLoading(false)
    }
  }

  const handleStake = async () => {
    try {
      if (!balanceData) return

      const amount = prompt('Enter amount to stake:')
      if (!amount) return

      await contractService.initialize()
      const tx = await contractService.stakeTokens(amount)
      
      // Wait for transaction
      await tx.wait()
      
      // Refresh balance
      await fetchBalance()
      
      alert('Tokens staked successfully!')
    } catch (error) {
      console.error('Error staking tokens:', error)
      alert('Failed to stake tokens')
    }
  }

  const handleClaimRewards = async () => {
    try {
      await contractService.initialize()
      const tx = await contractService.claimRewards()
      
      // Wait for transaction
      await tx.wait()
      
      // Refresh balance
      await fetchBalance()
      
      alert('Rewards claimed successfully!')
    } catch (error) {
      console.error('Error claiming rewards:', error)
      alert('Failed to claim rewards')
    }
  }

  const addTokenToMetaMask = async () => {
    try {
      if (!window.ethereum) {
        alert('MetaMask not detected')
        return
      }

      const tokenAddress = process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS
      const tokenSymbol = 'KCODE'
      const tokenDecimals = 18
      const tokenImage = `${window.location.origin}/kcode-token-icon.svg`

      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            image: tokenImage,
          },
        },
      })

      if (wasAdded) {
        alert('KCODE token added to MetaMask!')
      } else {
        alert('Failed to add token to MetaMask')
      }
    } catch (error) {
      console.error('Error adding token to MetaMask:', error)
      alert('Error adding token to MetaMask')
    }
  }

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] border border-[#FF9500]/20 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-[#FF9500]/30 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-[#FF9500]/20" />
            <div className="h-4 bg-[#FF9500]/20 w-3/4" />
            <div className="h-4 bg-[#FF9500]/20 w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#0a0a0a] border border-red-400/30 p-6">
        <div className="text-center">
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchBalance}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!balanceData) return null

  return (
    <div className="bg-[#0a0a0a] border border-[#FF9500]/20 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-serif font-bold text-[#FF9500]">Token Balance</h3>
        <button
          onClick={fetchBalance}
          className="text-white/50 hover:text-[#FF9500] transition-colors"
        >
          🔄
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* KCODE Balance */}
        <div className="bg-black/50 border border-[#FF9500]/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-[#FF9500]" />
            <span className="text-white/70 text-sm">KCODE Balance</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatTokenAmount(balanceData.tokenBalance)}
          </div>
        </div>

        {/* Pending Rewards */}
        <div className="bg-black/50 border border-[#FF9500]/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-[#FF9500]" />
            <span className="text-white/70 text-sm">Pending Rewards</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatTokenAmount(balanceData.pendingRewards)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={handleStake}
          className="px-4 py-2 bg-[#FF9500] hover:bg-[#FFB340] text-black font-semibold transition-all duration-300 transform hover:scale-105"
        >
          Stake Tokens
        </button>

        <button
          onClick={handleClaimRewards}
          disabled={parseFloat(balanceData.pendingRewards) === 0}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Claim Rewards
        </button>

        <button
          onClick={addTokenToMetaMask}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add to MetaMask
        </button>
      </div>

      {/* Wallet Address */}
      <div className="mt-4 pt-4 border-t border-[#FF9500]/30">
        <div className="text-xs text-white/50">
          Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </div>
      </div>
    </div>
  )
}