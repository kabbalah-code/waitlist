"use client"

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Wifi, WifiOff, Coins } from 'lucide-react'

interface CompactNetworkStatusProps {
  walletAddress?: string
}

interface NetworkStatus {
  isCorrectNetwork: boolean
  currentChainId: string | null
  hasToken: boolean
  ethBalance: string
  tokenBalance: string
}

export function CompactNetworkStatus({ walletAddress }: CompactNetworkStatusProps) {
  const [status, setStatus] = useState<NetworkStatus>({
    isCorrectNetwork: false,
    currentChainId: null,
    hasToken: false,
    ethBalance: '0',
    tokenBalance: '0'
  })
  const [isExpanded, setIsExpanded] = useState(false)

  const POLYGON_AMOY_CHAIN_ID = '0x13882' // 80002 in hex
  const KCODE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS || '0xa5287dD17c8Dc19ed51C64F554Fd247126618a19'

  useEffect(() => {
    checkNetworkStatus()
    
    if (window.ethereum) {
      window.ethereum.on('chainChanged', checkNetworkStatus)
      window.ethereum.on('accountsChanged', checkNetworkStatus)
    }

    // Close panel when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isExpanded && !target.closest('.network-status-panel')) {
        setIsExpanded(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', checkNetworkStatus)
        window.ethereum.removeListener('accountsChanged', checkNetworkStatus)
      }
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [walletAddress, isExpanded])

  const checkNetworkStatus = async () => {
    if (!window.ethereum || !walletAddress) return

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string
      const isCorrectNetwork = chainId === POLYGON_AMOY_CHAIN_ID

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

        // Check KCODE token balance from our API using authenticated fetch
        try {
          const { apiCall } = await import('../../lib/api/authenticated-fetch')
          const response = await apiCall('/api/web3/balance')
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data.kcode) {
              tokenBalance = parseFloat(data.data.kcode).toFixed(2)
              hasToken = true
            }
          }
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

  const switchToPolygonAmoyNetwork = async () => {
    if (!window.ethereum) return

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_AMOY_CHAIN_ID }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: POLYGON_AMOY_CHAIN_ID,
              chainName: 'Polygon Amoy Testnet',
              nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18
              },
              rpcUrls: ['https://rpc-amoy.polygon.technology'],
              blockExplorerUrls: ['https://amoy.polygonscan.com']
            }]
          })
        } catch (addError) {
          console.error('Error adding network:', addError)
        }
      }
    }
  }

  const addKCodeToken = async () => {
    if (!window.ethereum) return

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
      
      setTimeout(checkNetworkStatus, 1000)
    } catch (error) {
      console.error('Error adding token:', error)
    }
  }

  if (!walletAddress) {
    return null
  }

  return (
    <div className="relative network-status-panel">
      {/* Compact Status Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm border transition-colors ${
          status.isCorrectNetwork 
            ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20' 
            : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
        }`}
      >
        {status.isCorrectNetwork ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {status.isCorrectNetwork ? 'Polygon Amoy' : 'Wrong Network'}
        </span>
        {status.isCorrectNetwork && (
          <div className="flex items-center gap-1 text-xs">
            <span>{status.ethBalance} MATIC</span>
            {status.hasToken && (
              <>
                <span>•</span>
                <span>{status.tokenBalance} KCODE</span>
              </>
            )}
          </div>
        )}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-black border border-[#FF9500]/30 p-4 z-50">
          <h3 className="text-[#FF9500] font-bold mb-3 flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Network Status
          </h3>

          <div className="space-y-3">
            {/* Network Status */}
            <div className="flex items-center justify-between p-2 bg-black/50 border border-[#FF9500]/10">
              <div className="flex items-center gap-2">
                {status.isCorrectNetwork ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <div>
                  <p className="text-white text-sm font-medium">
                    {status.isCorrectNetwork ? 'Polygon Amoy' : 'Wrong Network'}
                  </p>
                  <p className="text-white/50 text-xs">
                    Chain ID: {status.currentChainId || 'Unknown'}
                  </p>
                </div>
              </div>
              {!status.isCorrectNetwork && (
                <button
                  onClick={switchToPolygonAmoyNetwork}
                  className="px-3 py-1 bg-[#FF9500] hover:bg-[#FFB340] text-black text-xs font-semibold transition-colors"
                >
                  Switch
                </button>
              )}
            </div>

            {/* MATIC Balance */}
            {status.isCorrectNetwork && (
              <div className="flex items-center justify-between p-2 bg-black/50 border border-[#FF9500]/10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#8247E5] rounded-full flex items-center justify-center text-white text-xs font-bold">
                    ⬡
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Test MATIC</p>
                    <p className="text-white/50 text-xs">{status.ethBalance} MATIC</p>
                  </div>
                </div>
                {parseFloat(status.ethBalance) < 0.001 && (
                  <button
                    onClick={() => window.open('https://faucet.polygon.technology/', '_blank')}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                  >
                    Faucet
                  </button>
                )}
              </div>
            )}

            {/* KCODE Token */}
            {status.isCorrectNetwork && (
              <div className="flex items-center justify-between p-2 bg-black/50 border border-[#FF9500]/10">
                <div className="flex items-center gap-2">
                  {status.hasToken ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <div>
                    <p className="text-white text-sm font-medium">KCODE Token</p>
                    <p className="text-white/50 text-xs">
                      {status.hasToken ? `${status.tokenBalance} KCODE` : 'Not added'}
                    </p>
                  </div>
                </div>
                {!status.hasToken && (
                  <button
                    onClick={addKCodeToken}
                    className="px-3 py-1 bg-[#FF9500] hover:bg-[#FFB340] text-black text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Coins className="w-3 h-3" />
                    Add
                  </button>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.open(`https://amoy.polygonscan.com/address/${walletAddress}`, '_blank')}
                className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs transition-colors"
              >
                Explorer
              </button>
              <button
                onClick={checkNetworkStatus}
                className="px-2 py-1 bg-[#FF9500]/20 hover:bg-[#FF9500]/30 text-[#FF9500] text-xs transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}