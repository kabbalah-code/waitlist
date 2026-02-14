"use client"

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, ExternalLink, Wallet, Network, Coins } from 'lucide-react'

interface NetworkManagerProps {
  walletAddress?: string
}

interface NetworkStatus {
  isCorrectNetwork: boolean
  currentChainId: string | null
  hasToken: boolean
  ethBalance: string
  tokenBalance: string
}

export function NetworkManager({ walletAddress }: NetworkManagerProps) {
  const [status, setStatus] = useState<NetworkStatus>({
    isCorrectNetwork: false,
    currentChainId: null,
    hasToken: false,
    ethBalance: '0',
    tokenBalance: '0'
  })
  const [loading, setLoading] = useState(false)

  const BASE_SEPOLIA_CHAIN_ID = '0x14a34' // 84532 in hex
  const KCODE_TOKEN_ADDRESS = '0x93180EAF5b2C88A2F671cC186c329BEBE619fFB2'

  useEffect(() => {
    checkNetworkStatus()
    
    // Listen for network changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', checkNetworkStatus)
      window.ethereum.on('accountsChanged', checkNetworkStatus)
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', checkNetworkStatus)
        window.ethereum.removeListener('accountsChanged', checkNetworkStatus)
      }
    }
  }, [walletAddress])

  const checkNetworkStatus = async () => {
    if (!window.ethereum || !walletAddress) return

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string
      const isCorrectNetwork = chainId === BASE_SEPOLIA_CHAIN_ID

      let ethBalance = '0'
      let tokenBalance = '0'
      let hasToken = false

      if (isCorrectNetwork) {
        // Check ETH balance
        const ethBalanceWei = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [walletAddress, 'latest']
        }) as string
        ethBalance = (parseInt(ethBalanceWei, 16) / 1e18).toFixed(4)

        // Check if KCODE token is added
        try {
          const tokenBalanceWei = await window.ethereum.request({
            method: 'eth_call',
            params: [{
              to: KCODE_TOKEN_ADDRESS,
              data: `0x70a08231000000000000000000000000${walletAddress.slice(2)}`
            }, 'latest']
          }) as string
          tokenBalance = (parseInt(tokenBalanceWei, 16) / 1e18).toFixed(2)
          hasToken = true
        } catch {
          hasToken = false
        }
      }

      setStatus({
        isCorrectNetwork,
        currentChainId: chainId,
        hasToken,
        ethBalance,
        tokenBalance
      })
    } catch (error) {
      console.error('Error checking network status:', error)
    }
  }

  const switchToBaseSepoliaNetwork = async () => {
    if (!window.ethereum) return

    setLoading(true)
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }],
      })
    } catch (switchError: any) {
      // If network is not added, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_SEPOLIA_CHAIN_ID,
              chainName: 'Base Sepolia',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://sepolia.base.org'],
              blockExplorerUrls: ['https://sepolia.basescan.org']
            }]
          })
        } catch (addError) {
          console.error('Error adding network:', addError)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const addKCodeToken = async () => {
    if (!window.ethereum) return

    setLoading(true)
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: KCODE_TOKEN_ADDRESS,
            symbol: 'KCODE',
            decimals: 18,
            image: `${window.location.origin}/kcode-logo.png`
          }
        } as any
      })
      
      // Recheck status after adding token
      setTimeout(checkNetworkStatus, 1000)
    } catch (error) {
      console.error('Error adding token:', error)
    } finally {
      setLoading(false)
    }
  }

  const openFaucet = () => {
    window.open('https://www.alchemy.com/faucets/base-sepolia', '_blank')
  }

  const openBlockExplorer = () => {
    window.open(`https://sepolia.basescan.org/address/${walletAddress}`, '_blank')
  }

  if (!walletAddress) {
    return (
      <div className="bg-[#0a0a0a] border border-[#FF9500]/20 p-6">
        <div className="flex items-center gap-3 text-white/50">
          <Wallet className="w-5 h-5" />
          <span>Connect wallet to check network status</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0a0a0a] border border-[#FF9500]/20 p-6">
      <h3 className="text-lg font-bold text-[#FF9500] mb-4 flex items-center gap-2">
        <Network className="w-5 h-5" />
        Network Status
      </h3>

      <div className="space-y-4">
        {/* Network Status */}
        <div className="flex items-center justify-between p-3 bg-black/50 border border-[#FF9500]/10">
          <div className="flex items-center gap-3">
            {status.isCorrectNetwork ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <div>
              <p className="text-white font-medium">
                {status.isCorrectNetwork ? 'Base Sepolia' : 'Wrong Network'}
              </p>
              <p className="text-white/50 text-sm">
                Chain ID: {status.currentChainId || 'Unknown'}
              </p>
            </div>
          </div>
          {!status.isCorrectNetwork && (
            <button
              onClick={switchToBaseSepoliaNetwork}
              disabled={loading}
              className="px-4 py-2 bg-[#FF9500] hover:bg-[#FFB340] text-black font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Switching...' : 'Switch Network'}
            </button>
          )}
        </div>

        {/* ETH Balance */}
        {status.isCorrectNetwork && (
          <div className="flex items-center justify-between p-3 bg-black/50 border border-[#FF9500]/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#627EEA] rounded-full flex items-center justify-center text-white text-xs font-bold">
                ETH
              </div>
              <div>
                <p className="text-white font-medium">Test ETH Balance</p>
                <p className="text-white/50 text-sm">{status.ethBalance} ETH</p>
              </div>
            </div>
            {parseFloat(status.ethBalance) < 0.001 && (
              <button
                onClick={openFaucet}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors flex items-center gap-2"
              >
                Get ETH <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* KCODE Token */}
        {status.isCorrectNetwork && (
          <div className="flex items-center justify-between p-3 bg-black/50 border border-[#FF9500]/10">
            <div className="flex items-center gap-3">
              {status.hasToken ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              <div>
                <p className="text-white font-medium">KCODE Token</p>
                <p className="text-white/50 text-sm">
                  {status.hasToken ? `${status.tokenBalance} KCODE` : 'Not added to wallet'}
                </p>
              </div>
            </div>
            {!status.hasToken && (
              <button
                onClick={addKCodeToken}
                disabled={loading}
                className="px-4 py-2 bg-[#FF9500] hover:bg-[#FFB340] text-black font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Adding...' : 'Add Token'} <Coins className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {status.isCorrectNetwork && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={openBlockExplorer}
              className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors flex items-center justify-center gap-2"
            >
              View on Explorer <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={checkNetworkStatus}
              className="px-3 py-2 bg-[#FF9500]/20 hover:bg-[#FF9500]/30 text-[#FF9500] text-sm transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        )}

        {/* Help Text */}
        {!status.isCorrectNetwork && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <p className="font-medium mb-1">⚠️ Wrong Network Detected</p>
            <p>Please switch to Base Sepolia testnet to use all features.</p>
          </div>
        )}

        {status.isCorrectNetwork && parseFloat(status.ethBalance) < 0.001 && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm">
            <p className="font-medium mb-1">💰 Low ETH Balance</p>
            <p>You need test ETH for transaction fees. Get some from the faucet!</p>
          </div>
        )}
      </div>
    </div>
  )
}