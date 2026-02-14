"use client"

import { useState, useEffect } from 'react'
import { ExternalLink, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface Transaction {
  hash: string
  type: string
  status: 'pending' | 'confirmed' | 'failed'
  timestamp: number
  description: string
  gasUsed?: string
  blockNumber?: number
}

interface TransactionTrackerProps {
  walletAddress?: string
}

export function TransactionTracker({ walletAddress }: TransactionTrackerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (walletAddress) {
      loadTransactions()
    }
  }, [walletAddress])

  const loadTransactions = async () => {
    if (!walletAddress) return

    setLoading(true)
    try {
      // Load from localStorage (recent transactions)
      const stored = localStorage.getItem(`transactions_${walletAddress}`)
      let storedTxs: Transaction[] = []
      if (stored) {
        storedTxs = JSON.parse(stored)
        setTransactions(storedTxs)
        
        // Update status of pending transactions
        updatePendingTransactions(storedTxs)
      }

      // Load from database using authenticated fetch
      const { apiCall } = await import('../../lib/api/authenticated-fetch')
      const response = await apiCall('/api/web3/transactions')

      if (response.ok) {
        const result = await response.json()
        console.log('[TransactionTracker] API response:', result)
        
        if (result.success && result.transactions && result.transactions.length > 0) {
          const dbTxs = result.transactions.map((tx: any) => ({
            hash: tx.transaction_hash,
            type: tx.transaction_type,
            status: tx.status as Transaction['status'],
            timestamp: new Date(tx.created_at).getTime(),
            description: tx.description || getTransactionDescription(tx.transaction_type),
            gasUsed: tx.gas_used,
            blockNumber: tx.block_number
          }))
          
          console.log('[TransactionTracker] Mapped transactions:', dbTxs)
          
          // Merge with localStorage transactions
          const allTxs = mergeTransactions(storedTxs, dbTxs)
          setTransactions(allTxs)
          console.log('[TransactionTracker] Final transactions:', allTxs)
        } else {
          // No blockchain transactions, try to load game transactions as fallback
          console.log('[TransactionTracker] No blockchain transactions, loading game transactions...')
          
          const gameResponse = await apiCall('/api/user/transactions')
          if (gameResponse.ok) {
            const gameResult = await gameResponse.json()
            
            if (gameResult.success && gameResult.transactions && gameResult.transactions.length > 0) {
              const gameTxs = gameResult.transactions.slice(0, 10).map((tx: any) => ({
                hash: `game-${tx.id}`,
                type: tx.type,
                status: 'confirmed' as Transaction['status'],
                timestamp: new Date(tx.created_at).getTime(),
                description: tx.description || `${tx.type}: ${tx.amount > 0 ? '+' : ''}${tx.amount} points`,
                gasUsed: undefined,
                blockNumber: undefined
              }))
              
              console.log('[TransactionTracker] Using game transactions:', gameTxs)
              setTransactions(gameTxs)
            }
          }
        }
      } else {
        console.error('[TransactionTracker] API call failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePendingTransactions = async (txs: Transaction[]) => {
    if (!window.ethereum) return

    const pendingTxs = txs.filter(tx => tx.status === 'pending')
    if (pendingTxs.length === 0) return

    for (const tx of pendingTxs) {
      try {
        const receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [tx.hash]
        }) as any

        if (receipt) {
          const updatedTx: Transaction = {
            ...tx,
            status: receipt.status === '0x1' ? 'confirmed' : 'failed',
            gasUsed: parseInt(receipt.gasUsed, 16).toString(),
            blockNumber: parseInt(receipt.blockNumber, 16)
          }

          setTransactions(prev => 
            prev.map(t => t.hash === tx.hash ? updatedTx : t)
          )

          // Update localStorage
          const updated = txs.map(t => t.hash === tx.hash ? updatedTx : t)
          localStorage.setItem(`transactions_${walletAddress}`, JSON.stringify(updated))
        }
      } catch (error) {
        console.error(`Error checking transaction ${tx.hash}:`, error)
      }
    }
  }

  const mergeTransactions = (localTxs: Transaction[], dbTxs: Transaction[]): Transaction[] => {
    const merged = [...dbTxs]
    
    localTxs.forEach(localTx => {
      if (!merged.find(tx => tx.hash === localTx.hash)) {
        merged.push(localTx)
      }
    })

    return merged.sort((a, b) => b.timestamp - a.timestamp)
  }

  const addTransaction = (tx: Omit<Transaction, 'timestamp'>) => {
    const newTx: Transaction = {
      ...tx,
      timestamp: Date.now()
    }

    setTransactions(prev => [newTx, ...prev])

    // Save to localStorage
    const stored = localStorage.getItem(`transactions_${walletAddress}`) || '[]'
    const storedTxs = JSON.parse(stored)
    const updated = [newTx, ...storedTxs].slice(0, 50) // Keep last 50
    localStorage.setItem(`transactions_${walletAddress}`, JSON.stringify(updated))
  }

  const getTransactionDescription = (type: string): string => {
    const descriptions: Record<string, string> = {
      'mint_reward': 'Game Reward Minted',
      'stake': 'Tokens Staked',
      'unstake': 'Tokens Unstaked',
      'claim_rewards': 'Rewards Claimed',
      'nft_mint': 'NFT Minted',
      'nft_upgrade': 'NFT Upgraded',
      'purchase': 'Item Purchased',
      'convert_points': 'Points Converted'
    }
    return descriptions[type] || 'Transaction'
  }

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400'
      case 'confirmed':
        return 'text-green-400'
      case 'failed':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const openInExplorer = (hash: string) => {
    window.open(`https://sepolia.basescan.org/tx/${hash}`, '_blank')
  }

  // Expose addTransaction function globally for other components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).addTransaction = addTransaction
    }
  }, [walletAddress])

  if (!walletAddress) {
    return (
      <div className="bg-[#0a0a0a] border border-[#FF9500]/20 p-6">
        <div className="flex items-center gap-3 text-white/50">
          <Clock className="w-5 h-5" />
          <span>Connect wallet to view transactions</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0a0a0a] border border-[#FF9500]/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#FF9500] flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Transactions
        </h3>
        <button
          onClick={loadTransactions}
          disabled={loading}
          className="text-white/50 hover:text-[#FF9500] transition-colors disabled:opacity-50"
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-white/50">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No transactions yet</p>
          <p className="text-sm">Start using the app to see your transaction history</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {transactions.slice(0, 10).map((tx) => (
            <div
              key={tx.hash}
              className="flex items-center justify-between p-3 bg-black/50 border border-[#FF9500]/10 hover:border-[#FF9500]/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getStatusIcon(tx.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {tx.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span className={getStatusColor(tx.status)}>
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </span>
                    <span>•</span>
                    <span>{new Date(tx.timestamp).toLocaleString()}</span>
                    {tx.blockNumber && (
                      <>
                        <span>•</span>
                        <span>Block {tx.blockNumber}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => openInExplorer(tx.hash)}
                className="ml-2 p-1 text-white/50 hover:text-[#FF9500] transition-colors"
                title="View on Block Explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {transactions.length > 10 && (
            <div className="text-center pt-2">
              <button
                onClick={() => window.open(`https://sepolia.basescan.org/address/${walletAddress}`, '_blank')}
                className="text-[#FF9500] hover:underline text-sm flex items-center justify-center gap-1"
              >
                View all transactions <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper function for other components to track transactions
export const trackTransaction = (
  hash: string,
  type: string,
  description: string
) => {
  if (typeof window !== 'undefined' && (window as any).addTransaction) {
    (window as any).addTransaction({
      hash,
      type,
      status: 'pending' as const,
      description
    })
  }
}