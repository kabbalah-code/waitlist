'use client'

import { useEffect } from 'react'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { polygonAmoy } from 'wagmi/chains'

let modalInitialized = false

export function useInitializeWeb3Modal(config: any, projectId: string) {
  useEffect(() => {
    if (modalInitialized || !projectId) return

    try {
      createWeb3Modal({
        wagmiConfig: config,
        projectId,
        enableAnalytics: false,
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
      
      modalInitialized = true
    } catch (error) {
      console.error('[WalletConnect] Failed to initialize modal:', error)
    }
  }, [config, projectId])
}
