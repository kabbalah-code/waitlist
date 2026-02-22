'use client'

import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { polygonAmoy } from '@reown/appkit/networks'
import { cookieStorage, createStorage } from 'wagmi'

// 1. Get projectId
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!

if (!projectId) {
  throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set')
}

// 2. Create wagmiAdapter
const metadata = {
  name: 'KABBALAH CODE',
  description: 'Daily mystical predictions powered by sacred Kabbalah numerology',
  url: 'https://www.kabbalahcode.space',
  icons: ['https://www.kabbalahcode.space/logo.png']
}

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks: [polygonAmoy]
})

export const config = wagmiAdapter.wagmiConfig

// 3. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [polygonAmoy],
  defaultNetwork: polygonAmoy,
  metadata,
  themeMode: 'dark',
  themeVariables: {
    '--apkt-accent': '#FF9500',
    '--apkt-color-mix': '#FF9500',
    '--apkt-color-mix-strength': 10,
    '--apkt-border-radius-master': '12px',
    '--apkt-font-family': 'var(--font-inter), sans-serif',
    '--apkt-z-index': 9999,
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
  ],
  allWallets: 'SHOW',
  features: {
    email: false,
    socials: [],
    emailShowWallets: false,
    analytics: false,
    onramp: false,
    swaps: false
  }
})


