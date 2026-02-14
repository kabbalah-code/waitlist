"use client"

import { useState, useEffect } from 'react'
import { Coins, TrendingUp, TrendingDown, Clock, ExternalLink } from 'lucide-react'
import { apiCall } from '@/lib/api/authenticated-fetch'

interface TokenTransaction {
  id: string
  uniqueId?: string // ✅ Добавляем для уникальных React keys
  user_id: string
  transaction_hash: string
  transaction_type: 'mint' | 'transfer' | 'burn' | 'reward'
  amount: string
  from_address?: string
  to_address?: string
  status: 'pending' | 'confirmed' | 'failed'
  block_number?: number
  gas_used?: string
  description?: string
  created_at: string
}

interface TokenHistoryProps {
  walletAddress?: string
  refreshTrigger?: number // Изменение этого значения триггерит обновление
}

export function TokenHistory({ walletAddress, refreshTrigger }: TokenHistoryProps) {
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [totalEarned, setTotalEarned] = useState(0)

  useEffect(() => {
    if (walletAddress) {
      loadTokenHistory()
    }
  }, [walletAddress, refreshTrigger]) // Добавляем refreshTrigger в dependencies

  const loadTokenHistory = async () => {
    if (!walletAddress) return

    setLoading(true)
    try {
      // 🔗 ТОЛЬКО РЕАЛЬНЫЕ БЛОКЧЕЙН ТРАНЗАКЦИИ
      const blockchainResponse = await apiCall('/api/web3/transactions')
      let allTxs: TokenTransaction[] = []
      
      if (blockchainResponse.ok) {
        const blockchainResult = await blockchainResponse.json()
        if (blockchainResult.success && blockchainResult.transactions) {
          allTxs = blockchainResult.transactions
            .map((tx: any) => ({
              id: tx.id,
              user_id: tx.user_id,
              transaction_hash: tx.transaction_hash,
              transaction_type: tx.transaction_type,
              amount: tx.amount,
              from_address: tx.from_address,
              to_address: tx.to_address,
              status: tx.status,
              block_number: tx.block_number,
              gas_used: tx.gas_used,
              description: tx.description || 'Blockchain Transaction',
              created_at: tx.created_at
            }))
            // Show all transactions, including those without valid blockchain hashes
            // Some rewards (like wheel spins) may have database-only tracking
        }
      }
      
      // Сортируем по времени и добавляем уникальные ID
      const sortedTxs = allTxs
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((tx, index) => ({
          ...tx,
          uniqueId: `${tx.id}-${tx.transaction_hash}-${index}` // Уникальный ID для React key
        }))
      
      console.log('[TokenHistory] Loaded transactions:', {
        total: sortedTxs.length,
        byType: sortedTxs.reduce((acc: any, tx: any) => {
          acc[tx.transaction_type] = (acc[tx.transaction_type] || 0) + 1
          return acc
        }, {}),
        descriptions: sortedTxs.map((tx: any) => tx.description)
      })
      
      setTransactions(sortedTxs)
      
      // ✅ Calculate total earned tokens (только положительные транзакции)
      const earned = sortedTxs.reduce((sum: number, tx: any) => {
        const amount = parseFloat(tx.amount)
        return amount > 0 ? sum + amount : sum
      }, 0)
      setTotalEarned(earned)
      
    } catch (error) {
      console.error('[TokenHistory] Error loading token history:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Безопасное открытие в эксплорере (проверяем наличие и валидность хеша)
  const openInExplorer = (hash?: string) => {
    if (!hash) {
      console.warn('[TokenHistory] No transaction hash available')
      return
    }
    
    // Check if it's a valid blockchain hash (66 chars, starts with 0x)
    if (hash.length !== 66 || !hash.startsWith('0x')) {
      console.warn('[TokenHistory] Invalid blockchain hash format:', hash)
      return
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BLOCK_EXPLORER || 'https://sepolia.basescan.org'
    window.open(`${baseUrl}/tx/${hash}`, '_blank')
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'mint':
      case 'reward':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'transfer':
        return <Coins className="w-4 h-4 text-blue-500" />
      case 'burn':
      case 'wheel_spin_purchase':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'mint':
      case 'reward':
        return 'text-green-400'
      case 'transfer':
        return 'text-blue-400'
      case 'burn':
      case 'wheel_spin_purchase':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const getTransactionSign = (type: string) => {
    switch (type) {
      case 'mint':
      case 'reward':
        return '+'
      case 'burn':
      case 'wheel_spin_purchase':
        return '-'
      default:
        return ''
    }
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

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount)
    
    // Smart formatting: integers without decimals, fractions with up to 2 decimals
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
          <span>Connect wallet to view KCODE history</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0a0a0a] border border-[#FF9500]/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#FF9500] flex items-center gap-2">
          <Coins className="w-5 h-5" />
          KCODE Token History & Transactions
        </h3>
        <button
          onClick={loadTokenHistory}
          disabled={loading}
          className="text-white/50 hover:text-[#FF9500] transition-colors disabled:opacity-50"
          title="Refresh"
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {/* Total Earned Summary */}
      {totalEarned > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20">
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-sm">Total KCODE Earned (from tasks)</span>
            <span className="text-green-400 font-bold text-lg">
              +{formatAmount(totalEarned.toString())} KCODE
            </span>
          </div>
          <p className="text-xs text-white/50 mt-1">Check your wallet for actual balance</p>
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-white/50">
          <Coins className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No KCODE transactions yet</p>
          <p className="text-sm mt-1">Complete tasks and rituals to earn KCODE tokens</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {transactions.map((tx, index) => (
            <div
              key={tx.uniqueId || `${tx.id}-${index}`} // ✅ Используем uniqueId или fallback
              className="flex items-center justify-between p-3 bg-black/50 border border-[#FF9500]/10 hover:border-[#FF9500]/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getTransactionIcon(tx.transaction_type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium">
                      {tx.description || tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                    <span className={`font-bold ${getTransactionColor(tx.transaction_type)}`}>
                      {getTransactionSign(tx.transaction_type)}{formatAmount(tx.amount)} KCODE
                    </span>
                    <span>•</span>
                    {getStatusBadge(tx.status)}
                    {tx.transaction_hash && (
                      <>
                        <span>•</span>
                        {tx.transaction_hash.length === 66 && tx.transaction_hash.startsWith('0x') ? (
                          <button
                            onClick={() => openInExplorer(tx.transaction_hash)}
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
          
          {transactions.length > 10 && (
            <div className="text-center pt-2">
              <button
                onClick={() => window.open(`https://sepolia.basescan.org/address/${walletAddress}`, '_blank')}
                className="text-[#FF9500] hover:underline text-sm flex items-center justify-center gap-1"
              >
                View all on explorer <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}