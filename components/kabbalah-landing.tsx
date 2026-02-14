"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { HeroSection } from "./sections/hero-section"
import { ProblemSection } from "./sections/problem-section"
import { SolutionSection } from "./sections/solution-section"
import { JourneySection } from "./sections/journey-section"
import { RoadmapSection } from "./sections/roadmap-section"
import { WaitlistSection } from "./sections/waitlist-section"
import { FaqSection } from "./sections/faq-section"
import { CtaSection } from "./sections/cta-section"
import { Navigation } from "./ui/navigation"
import { WalletModal } from "./ui/wallet-modal"
import { WaitlistFormModal } from "./waitlist/waitlist-form-modal"

export default function KabbalahLanding() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [showReconnectMessage, setShowReconnectMessage] = useState(false)
  const searchParams = useSearchParams()
  const referralCode = searchParams.get("ref") || undefined
  const reconnect = searchParams.get("reconnect")
  
  // Check if waitlist mode is enabled
  const isWaitlistEnabled = process.env.NEXT_PUBLIC_WAITLIST_ENABLED === 'true'

  // Check for existing wallet connection
  useEffect(() => {
    const stored = localStorage.getItem("kabbalah_wallet")
    if (stored) {
      try {
        const { address } = JSON.parse(stored)
        setWalletAddress(address)
      } catch {
        localStorage.removeItem("kabbalah_wallet")
      }
    }
    
    // Show reconnect message if redirected from dashboard
    if (reconnect === "true") {
      setShowReconnectMessage(true)
      // Auto-open wallet modal for reconnection
      setIsWalletModalOpen(true)
      // Clear the URL parameter
      window.history.replaceState({}, "", "/")
    }
  }, [reconnect])

  const handleWalletSuccess = (address: string) => {
    setWalletAddress(address)
    setIsWalletModalOpen(false)
    setShowReconnectMessage(false)
  }

  const handleDisconnect = () => {
    localStorage.removeItem("kabbalah_wallet")
    setWalletAddress(null)
  }

  const handleConnectClick = () => {
    if (isWaitlistEnabled) {
      setIsWaitlistModalOpen(true)
    } else {
      setIsWalletModalOpen(true)
    }
  }

  return (
    <div className="relative min-h-screen bg-black">
      <Navigation
        walletAddress={walletAddress}
        onConnectClick={handleConnectClick}
        onDisconnect={handleDisconnect}
      />

      {/* Reconnect Message */}
      {showReconnectMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-[#FF9500] text-black px-6 py-3 rounded-lg shadow-lg border border-[#FF9500]/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
            <span className="font-medium">Session expired. Please reconnect your wallet to continue.</span>
          </div>
        </div>
      )}

      <HeroSection onConnectClick={handleConnectClick} />
      <ProblemSection />
      <SolutionSection />
      <JourneySection />
      {isWaitlistEnabled && (
        <WaitlistSection onJoinClick={() => setIsWaitlistModalOpen(true)} />
      )}
      <RoadmapSection />
      <FaqSection />
      <CtaSection onConnectClick={handleConnectClick} />

      {/* Waitlist Modal (when enabled) */}
      {isWaitlistEnabled && (
        <WaitlistFormModal
          isOpen={isWaitlistModalOpen}
          onClose={() => setIsWaitlistModalOpen(false)}
          referralCode={referralCode}
        />
      )}

      {/* Wallet Modal (when waitlist disabled) */}
      {!isWaitlistEnabled && (
        <WalletModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          onSuccess={handleWalletSuccess}
          referralCode={referralCode}
        />
      )}
    </div>
  )
}