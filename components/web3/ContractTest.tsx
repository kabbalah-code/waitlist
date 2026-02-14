'use client'

import { useState, useEffect } from 'react'
import { contractService } from '@/lib/web3/contracts'

export default function ContractTest() {
  const [address, setAddress] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [tokenBalance, setTokenBalance] = useState<string>('0')
  const [userNFTs, setUserNFTs] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // Check wallet connection from localStorage
    const checkWallet = () => {
      const stored = localStorage.getItem('kabbalah_wallet')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          setAddress(data.address)
          setIsConnected(true)
        } catch (error) {
          console.error('Error parsing wallet data:', error)
        }
      }
    }

    checkWallet()
  }, [])

  useEffect(() => {
    if (isConnected && address) {
      loadUserData()
    }
  }, [isConnected, address])

  const loadUserData = async () => {
    if (!address) return
    
    setLoading(true)
    setError('')
    
    try {
      await contractService.initialize()
      
      // Load token balance
      const balance = await contractService.getTokenBalance(address)
      setTokenBalance(balance)
      
      // Load user NFTs
      const nfts = await contractService.getUserNFTs(address)
      setUserNFTs(nfts)
      
    } catch (err) {
      console.error('Error loading user data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testMintNFT = async () => {
    if (!address) return
    
    setLoading(true)
    setError('')
    
    try {
      await contractService.initialize()
      
      const tx = await contractService.mintNFT(
        0, // ACHIEVEMENT type
        0, // COMMON rarity
        false, // not soulbound
        'Test mystical properties',
        'https://example.com/metadata/1.json',
        '0.001' // 0.001 ETH
      )
      
      console.log('Mint transaction:', tx.hash)
      await tx.wait()
      
      // Reload data
      await loadUserData()
      
    } catch (err) {
      console.error('Error minting NFT:', err)
      setError(err instanceof Error ? err.message : 'Mint failed')
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="bg-black/50 border border-[#FF9500]/30 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-[#FF9500] mb-4 font-serif">Contract Testing</h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[#FF9500]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-[#FF9500] text-2xl">🔗</span>
          </div>
          <p className="text-white/70 mb-4">Connect your wallet to test smart contracts</p>
          <p className="text-white/50 text-sm">Make sure you're connected to Base Sepolia testnet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black/50 border border-[#FF9500]/30 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-[#FF9500] mb-6 font-serif">Contract Testing</h2>
      
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded text-red-300">
          <h3 className="font-semibold mb-2">Error</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 border border-[#FF9500]/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#FF9500]/20 rounded-full flex items-center justify-center">
                <span className="text-[#FF9500] text-sm font-bold">K</span>
              </div>
              <h3 className="font-semibold text-[#FF9500]">KCODE Balance</h3>
            </div>
            <p className="text-2xl font-bold text-white">{tokenBalance}</p>
            <p className="text-white/50 text-sm">ERC20 Token</p>
          </div>
          
          <div className="bg-black/30 border border-[#FF9500]/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#FF9500]/20 rounded-full flex items-center justify-center">
                <span className="text-[#FF9500] text-sm">🎨</span>
              </div>
              <h3 className="font-semibold text-[#FF9500]">NFTs Owned</h3>
            </div>
            <p className="text-2xl font-bold text-white">{userNFTs.length}</p>
            <p className="text-white/50 text-sm">ERC721 Collection</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={loadUserData}
              disabled={loading}
              className="px-4 py-3 bg-[#FF9500] hover:bg-[#FFB340] disabled:opacity-50 disabled:cursor-not-allowed rounded text-black font-semibold transition-colors"
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
            
            <button
              onClick={testMintNFT}
              disabled={loading}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white font-semibold transition-colors"
            >
              Mint NFT (0.001 ETH)
            </button>
          </div>
          
          {loading && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 text-[#FF9500]">
                <div className="w-4 h-4 border-2 border-[#FF9500] border-t-transparent rounded-full animate-spin"></div>
                <span>Processing transaction...</span>
              </div>
            </div>
          )}
        </div>
        
        {/* NFT Collection */}
        {userNFTs.length > 0 && (
          <div className="border-t border-[#FF9500]/20 pt-6">
            <h3 className="text-lg font-semibold text-[#FF9500] mb-4">Your NFT Collection</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {userNFTs.map(tokenId => (
                <div key={tokenId} className="bg-black/30 border border-[#FF9500]/20 rounded p-3 text-center">
                  <div className="w-12 h-12 bg-[#FF9500]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-[#FF9500] text-lg">🎨</span>
                  </div>
                  <p className="text-white font-semibold text-sm">#{tokenId}</p>
                  <p className="text-white/50 text-xs">NFT</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Contract Addresses */}
        <div className="border-t border-[#FF9500]/20 pt-6">
          <h3 className="text-lg font-semibold text-[#FF9500] mb-4">Contract Addresses</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-black/30 rounded p-3">
              <p className="text-[#FF9500] font-semibold mb-1">KCodeToken</p>
              <p className="text-white/70 font-mono text-xs break-all">
                {process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS}
              </p>
            </div>
            <div className="bg-black/30 rounded p-3">
              <p className="text-[#FF9500] font-semibold mb-1">KabbalhNFT</p>
              <p className="text-white/70 font-mono text-xs break-all">
                {process.env.NEXT_PUBLIC_KABBALAH_NFT_ADDRESS}
              </p>
            </div>
            <div className="bg-black/30 rounded p-3">
              <p className="text-[#FF9500] font-semibold mb-1">GameEconomics</p>
              <p className="text-white/70 font-mono text-xs break-all">
                {process.env.NEXT_PUBLIC_GAME_ECONOMICS_ADDRESS}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}