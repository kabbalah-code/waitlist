'use client'

import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'

export function WalletConnectButton() {
  const { open } = useWeb3Modal()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-lg">
          <span className="text-[#FF9500] font-mono text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <Button
          onClick={() => disconnect()}
          variant="outline"
          className="border-red-500/30 text-red-500 hover:bg-red-500/10"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={() => open()}
      className="bg-gradient-to-r from-[#FF9500] to-[#FF6B00] hover:from-[#FF6B00] hover:to-[#FF9500] text-white font-semibold px-6 py-2 rounded-lg transition-all duration-300"
    >
      Connect Wallet
    </Button>
  )
}
