'use client'

import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { polygonAmoy } from '@reown/appkit/networks'

// 1. Get projectId
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set')
}

// 2. Set up metadata
export const metadata = {
  name: 'KABBALAH CODE',
  description: 'Daily mystical predictions powered by sacred Kabbalah numerology',
  url: 'https://www.kabbalahcode.space',
  icons: ['https://www.kabbalahcode.space/logo.png']
}

// 3. Set the networks
export const networks = [polygonAmoy]

// 4. Create Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true
})

export const config = wagmiAdapter.wagmiConfig
