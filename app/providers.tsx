'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config, initWeb3Modal } from '@/lib/web3/config'
import { useEffect } from 'react'

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Web3Modal on client side after mount
    initWeb3Modal()
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

