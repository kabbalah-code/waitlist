"use client"

import { useState, useEffect } from 'react'
import { Coins, TrendingUp, TrendingDown, Clock, ExternalLink } from 'lucide-react'
import { apiCall } from '@/lib/api/authenticated-fetch'

interface Transaction {
  id: string
  uniqueId: string
  user_id: string
  transaction_hash: string
  transaction_type: 'mint' | 'transfer' | 'burn' | 'reward' | 'pol_reward'
  amount: string
  currency: 'KCODE' | 'POL'
  network: 'testnet' | 'mainnet'
  from_address?: string
  to_address?: string
  status: 'pending' | 'confirmed' | 'failed'
  block_number?: number
  gas_used?: string
  description?: string
  created_at: string
}

interface AllTransactionsHistoryProps {
  walletAddress?: string
  refreshTrigger?: number
}

export function AllTransactionsHistory({ walletAddress, refreshTrigger }: AllTransactionsHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [totalKcodeEarned, setTotalKcodeEarned] = useState(0)
  const [totalPolEarned, setTotalPolEarned] = useState(0)

  useEffect(() => {
    if (walletAddress) {
      loadAllTransactions()
    }
  }, [walletAddress, refreshTrigger])

  const loadAllTransactions = async () => {
    if (!walletAddress) return

    setLoading(true)
    try {
      // Load KCODE transactions (testnet)
      const kcodeResponse = await apiCall('/api/web3/transactions')
      let allTxs: Transaction[] = []
      
      if (kcodeResponse.ok) {
        const kcodeResult = await kcodeResponse.json()
        if (kcodeResult.success && kcodeResult.transactions) {
          const kcodeTxs = kcodeResult.transactions
            .map((tx: any) => ({
              id: tx.id,
              user_id: tx.user_id,
              transaction_hash: tx.transaction_hash,
              transaction_type: tx.transaction_type,
              amount: tx.amount,
              currency: 'KCODE' as const,
              network: 'testnet' as const,
              from_address: tx.from_address,
              to_address: tx.to_address,
              status: tx.status,
              block_number: tx.block_number,
              gas_used: tx.gas_used,
              description: tx.description || 'KCODE Transaction',
              created_at: tx.created_at
            }))
            // Show all transactions, including those with database-only hashes
          
          allTxs = [...allTxs, ...kcodeTxs]
        }
      }

      // Load POL transactions (mainnet) - TODO: implement API endpoint
      // For now, we'll load POL rewards from wheel_spins table
      const polResponse = await apiCall('/api/wheel/history')
      if (polResponse.ok) {
        const polResult = await polResponse.json()
        if (polResult.success && polResult.spins) {
          const polTxs = polResult.spins
            .filter((spin: any) => spin.reward_type === 'pol')
            .map((spin: any, index: number) => ({
              id: `pol-${spin.id}`,
              user_id: spin.user_id || '',
              transaction_hash: spin.transaction_hash || `pending-pol-${spin.id}`,
              transaction_type: 'pol_reward' as const,
              amount: (spin.reward_value / 100).toString(),
              currency: 'POL' as const,
              network: 'mainnet' as const,
              status: spin.transaction_hash ? 'confirmed' : 'pending' as const,
              description: 'Wheel of Fortune POL reward',
              created_at: spin.created_at
            }))
          
          allTxs = [...allTxs, ...polTxs]
        }
      }
      
      // Sort by time and add unique IDs
      const sortedTxs = allTxs
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((tx, index) => ({
          ...tx,
          uniqueId: `${tx.currency}-${tx.id}-${tx.transaction_hash}-${index}`
        }))
      
      setTransactions(sortedTxs)
      
      // Calculate totals
      const kcodeEarned = sortedTxs
        .filter(tx => tx.currency === 'KCODE' && parseFloat(tx.amount) > 0)
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
      
      const polEarned = sortedTxs
        .filter(tx => tx.currency === 'POL' && parseFloat(tx.amount) > 0)
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
      
      setTotalKcodeEarned(kcodeEarned)
      setTotalPolEarned(polEarned)
      
    } catch (error) {
      console.error('[AllTransactionsHistory] Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const openInExplorer = (tx: Transaction) => {
    if (!tx.transaction_hash || tx.transaction_hash.startsWith('pending-')) {
      console.warn('[AllTransactionsHistory] Transaction pending or no hash')
      return
    }
    
    // Check if it's a valid blockchain hash
    if (tx.transaction_hash.length !== 66 || !tx.transaction_hash.startsWith('0x')) {
      console.warn('[AllTransactionsHistory] Invalid blockchain hash format:', tx.transaction_hash)
      return
    }
    
    let explorerUrl = ''
    if (tx.network === 'testnet') {
      // Polygon Amoy testnet
      explorerUrl = `https://amoy.polygonscan.com/tx/${tx.transaction_hash}`
    } else {
      // Polygon mainnet
      explorerUrl = `https://polygonscan.com/tx/${tx.transaction_hash}`
    }
    
    window.open(explorerUrl, '_blank')
  }

  const getTransactionIcon = (tx: Transaction) => {
    if (tx.currency === 'POL') {
      return <TrendingUp className="w-4 h-4 text-purple-500" />
    }
    
    switch (tx.transaction_type) {
      case 'mint':
      case 'reward':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'transfer':
        return <Coins className="w-4 h-4 text-blue-500" />
      case 'burn':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getTransactionColor = (tx: Transaction) => {
    if (tx.currency === 'POL') {
      return 'text-purple-400'
    }
    
    switch (tx.transaction_type) {
      case 'mint':
      case 'reward':
        return 'text-green-400'
      case 'transfer':
        return 'text-blue-400'
      case 'burn':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const getTransactionSign = (tx: Transaction) => {
    // Wheel spin purchase is a deduction
    if (tx.transaction_type === 'burn' || tx.description?.includes('purchase')) {
      return '-'
    }
    // All other transactions are additions
    return parseFloat(tx.amount) > 0 ? '+' : ''
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-yellow-400 text-xs">⏳ Pending</span>
      case 'confirmed':
        return <span className="text-green-400 text-xs">✓ Confirmed</span>
      case 'failed':
        return <span className="text-red-400 text-xs">✗ Failed</span>
      default:
        return null
    }
  }

  const getNetworkBadge = (network: string) => {
    switch (network) {
      case 'testnet':
        return <span className="text-blue-400 text-xs bg-blue-500/10 px-2 py-0.5 border border-blue-500/20">Testnet</span>
      case 'mainnet':
        return <span className="text-purple-400 text-xs bg-purple-500/10 px-2 py-0.5 border border-purple-500/20">Mainnet</span>
      default:
        return null
    }
  }

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount)
    
    if (num === Math.floor(num)) {
      return num.toString()
    } else {
      return num.toFixed(2).replace(/\.?0+$/, '')
    }
  }

  if (!walletAddress) {
    return (
      <div className="bg-[#0a0a0a] border border-[#FF9500]/20 p-6">
        <div className="flex items-center gap-3 text-white/50">
          <Coins className="w-5 h-5" />
          <span>Connect wallet to view transaction history</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0a0a0a] border border-[#FF9500]/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#FF9500] flex items-center gap-2">
          <Coins className="w-5 h-5" />
          All Transactions (KCODE + POL)
        </h3>
        <button
          onClick={loadAllTransactions}
          disabled={loading}
          className="text-white/50 hover:text-[#FF9500] transition-colors disabled:opacity-50"
          title="Refresh"
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {/* Total Earned Summary */}
      {(totalKcodeEarned > 0 || totalPolEarned > 0) && (
        <div className="mb-4 space-y-2">
          {totalKcodeEarned > 0 && (
            <div className="p-3 bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Total KCODE Earned (Testnet)</span>
                <span className="text-green-400 font-bold text-lg">
                  +{formatAmount(totalKcodeEarned.toString())} KCODE
                </span>
              </div>
            </div>
          )}
          {totalPolEarned > 0 && (
            <div className="p-3 bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Total POL Earned (Mainnet)</span>
                <span className="text-purple-400 font-bold text-lg">
                  +{formatAmount(totalPolEarned.toString())} POL
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-white/50">
          <Coins className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No transactions yet</p>
          <p className="text-sm mt-1">Complete tasks and spin the wheel to earn rewards</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {transactions.map((tx) => (
            <div
              key={tx.uniqueId}
              className="flex items-center justify-between p-3 bg-black/50 border border-[#FF9500]/10 hover:border-[#FF9500]/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getTransactionIcon(tx)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium">
                      {tx.description}
                    </p>
                    {getNetworkBadge(tx.network)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50 mt-1 flex-wrap">
                    <span className={`font-bold ${getTransactionColor(tx)}`}>
                      {getTransactionSign(tx)}{formatAmount(tx.amount)} {tx.currency}
                    </span>
                    <span>•</span>
                    {getStatusBadge(tx.status)}
                    {tx.transaction_hash && !tx.transaction_hash.startsWith('pending-') && (
                      <>
                        <span>•</span>
                        {tx.transaction_hash.length === 66 && tx.transaction_hash.startsWith('0x') ? (
                          <button
                            onClick={() => openInExplorer(tx)}
                            className="text-[#FF9500] hover:underline flex items-center gap-1"
                            title="View on PolygonScan"
                          >
                            {tx.transaction_hash.slice(0, 10)}...{tx.transaction_hash.slice(-8)}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-white/30 text-xs" title="Database-only transaction">
                            {tx.transaction_hash}
                          </span>
                        )}
                      </>
                    )}
                    <span>•</span>
                    <span>{new Date(tx.created_at).toLocaleString()}</span>
                    {tx.block_number && (
                      <>
                        <span>•</span>
                        <span>Block {tx.block_number}</span>
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
