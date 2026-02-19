'use client'

import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { polygonAmoy } from 'wagmi/chains'
import { cookieStorage, createStorage } from 'wagmi'

// 1. Get projectId from https://cloud.walletconnect.com
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!

if (!projectId) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set')
}

// 2. Create wagmiConfig
const metadata = {
  name: 'KABBALAH CODE',
  description: 'Daily mystical predictions powered by sacred Kabbalah numerology',
  url: 'https://kabbalahcode.space',
  icons: ['https://kabbalahcode.space/logo.png']
}

const chains = [polygonAmoy] as const

export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage
  }),
})

