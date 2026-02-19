'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config, projectId } from '@/lib/web3/config'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { polygonAmoy } from 'wagmi/chains'
import { useEffect, useState } from 'react'

const queryClient = new QueryClient()

// Web3Modal initialization component - must be inside WagmiProvider
function Web3ModalInit() {
  useEffect(() => {
    // Create modal only once on client side
    createWeb3Modal({
      wagmiConfig: config,
      projectId,
      enableAnalytics: false,
      enableOnramp: false,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-color-mix': '#000000',
        '--w3m-accent': '#FF9500',
        '--w3m-border-radius-master': '8px',
      },
      featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
        '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
      ],
      allWallets: 'SHOW',
      defaultChain: polygonAmoy
    })
  }, []) // Empty deps - run only once

  return null
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

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
        <Web3ModalInit />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
