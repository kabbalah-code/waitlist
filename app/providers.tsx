'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/web3/config'
import { useWeb3ModalSetup } from '@/lib/web3/walletconnect'
import { useEffect, useState } from 'react'

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  
  // Initialize Web3Modal
  useWeb3ModalSetup()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    )
  }
  
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
