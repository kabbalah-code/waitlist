'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config, projectId } from '@/lib/web3/config'
import { useInitializeWeb3Modal } from '@/lib/web3/walletconnect'

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // Initialize Web3Modal on client side
  useInitializeWeb3Modal(config, projectId)
  
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
