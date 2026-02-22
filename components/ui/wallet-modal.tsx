"use client"

import { useState, useEffect } from "react"
import { X, Wallet, ExternalLink, Loader2, CheckCircle, AlertCircle, Smartphone } from "lucide-react"
import { useAppKit } from '@reown/appkit/react'
import { useAccount, useDisconnect, useSignMessage } from 'wagmi'
import { useRouter } from "next/navigation"

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (address: string) => void
  referralCode?: string
}

type ConnectionState = "idle" | "connecting" | "signing" | "creating" | "success" | "error"

export function WalletModal({ isOpen, onClose, onSuccess, referralCode }: WalletModalProps) {
  const [state, setState] = useState<ConnectionState>("idle")
  const [error, setError] = useState("")
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const router = useRouter()

  // Handle wallet connection and authentication
  useEffect(() => {
    if (isConnected && address && state === "idle") {
      handleAuthentication()
    }
  }, [isConnected, address])

  const handleAuthentication = async () => {
    if (!address) return

    try {
      setState("signing")
      setError("")

      console.log("[WalletModal] Connected to wallet:", address.slice(0, 10) + "...")

      // Get nonce from server
      console.log("[WalletModal] Fetching nonce from server...")
      const nonceResponse = await fetch("/api/auth/wallet", {
        method: "GET",
        credentials: "include",
      })

      if (!nonceResponse.ok) {
        throw new Error("Failed to get authentication nonce")
      }

      const { nonce } = await nonceResponse.json()
      console.log("[WalletModal] Nonce received:", nonce.slice(0, 8) + "...")

      // Create message for signing (must match backend!)
      const message = `Welcome to Kabbalah Code Game!

Click "Sign" to authenticate your wallet.

Wallet: ${address}
Nonce: ${nonce}

This request will not trigger a blockchain transaction or cost any gas fees.`

      console.log("[WalletModal] Requesting signature...")
      const signature = await signMessageAsync({ message })
      console.log("[WalletModal] Signature received:", signature.slice(0, 20) + "...")

      // Send to server for authentication
      setState("creating")
      console.log("[WalletModal] Sending authentication request...")
      const authResponse = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          walletAddress: address,
          signature,
          nonce,
          referralCode,
        }),
      })

      if (!authResponse.ok) {
        const errorData = await authResponse.json().catch(() => ({ error: 'Unknown error' }))
        console.error("[WalletModal] Authentication failed:", errorData)
        
        if (errorData.error?.includes('supabase') || errorData.error?.includes('database')) {
          throw new Error("⚠️ Database not configured. Please set up Supabase in .env.local")
        }
        
        throw new Error(errorData.error || "Authentication failed")
      }

      const { user, session } = await authResponse.json()
      console.log("[WalletModal] Authentication successful!", {
        userId: user.id,
        wallet: user.wallet_address,
        walletNumber: user.wallet_number
      })

      // Save to localStorage for client-side access
      const walletData = {
        address: address,
        walletNumber: user.wallet_number || 1,
        connectedAt: Date.now()
      }
      
      localStorage.setItem("kabbalah_wallet", JSON.stringify(walletData))
      localStorage.setItem("kabbalah_user_id", user.id)
      console.log("[WalletModal] ✅ Wallet data and user ID saved to localStorage")

      setState("success")

      setTimeout(() => {
        console.log("[WalletModal] Redirecting to dashboard...")
        onSuccess(address)
        router.push("/dashboard")
      }, 1000)
    } catch (err) {
      console.error("[WalletModal] Authentication error:", err)
      setState("error")
      const message = err instanceof Error ? err.message : "Authentication failed"
      
      if (message.includes("User rejected")) {
        setError("Signature was cancelled. Please try again and approve the signature request.")
        setState("idle")
      } else {
        setError(message)
      }
    }
  }

  const handleConnectClick = async () => {
    try {
      setState("connecting")
      await open()
    } catch (err) {
      console.error("[WalletModal] Connection error:", err)
      setState("error")
      setError(err instanceof Error ? err.message : "Connection failed")
    }
  }

  const resetState = () => {
    setState("idle")
    setError("")
    if (isConnected) {
      disconnect()
    }
  }

  useEffect(() => {
    if (!isOpen) {
      resetState()
    }
  }, [isOpen])

  if (!isOpen) return null

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-black border border-[#FF9500]/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#FF9500]/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>

          <div className="text-center">
            <h2 className="text-[#FF9500] font-bold text-2xl tracking-wider font-serif">KABBALAH</h2>
            <h3 className="text-white font-bold text-xl tracking-wider font-serif">CODE</h3>
            <p className="text-white/50 text-sm mt-2">Connect your wallet to begin</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {state === "success" ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-white text-lg font-medium">Connected Successfully</p>
              <p className="text-white/50 text-sm mt-2">{address && formatAddress(address)}</p>
              <p className="text-[#FF9500] text-sm mt-4">Redirecting to dashboard...</p>
            </div>
          ) : state === "error" ? (
            <div className="text-center py-8">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-white text-lg font-medium">Connection Failed</p>
              <p className="text-red-400 text-sm mt-2">{error}</p>
              <button
                onClick={resetState}
                className="mt-6 px-6 py-2 bg-[#FF9500] text-black font-bold text-sm uppercase hover:bg-[#FFB340] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* WalletConnect Button */}
              <button
                onClick={handleConnectClick}
                disabled={state !== "idle"}
                className="w-full p-4 border border-[#FF9500]/30 hover:border-[#FF9500] bg-[#0a0a0a] hover:bg-[#111] transition-all flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="w-12 h-12 bg-[#FF9500]/10 flex items-center justify-center">
                  {state === "connecting" || state === "signing" || state === "creating" ? (
                    <Loader2 className="w-6 h-6 text-[#FF9500] animate-spin" />
                  ) : (
                    <Wallet className="w-6 h-6 text-[#FF9500]" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium">Connect Wallet</p>
                  <p className="text-white/50 text-sm">
                    {state === "connecting" && "Opening wallet selector..."}
                    {state === "signing" && "Sign the message..."}
                    {state === "creating" && "Creating account..."}
                    {state === "idle" && "MetaMask, WalletConnect, Coinbase & more"}
                  </p>
                </div>
              </button>

              {/* Telegram Alternative */}
              <a
                href="https://t.me/KabbalahCodeBot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-4 border border-[#FF9500] text-[#FF9500] hover:bg-[#FF9500]/10 transition-colors flex items-center justify-center gap-2 font-bold uppercase tracking-wide"
              >
                <Smartphone size={18} />
                Open Telegram Bot
                <ExternalLink size={16} />
              </a>

              {referralCode && (
                <p className="text-center text-white/40 text-xs">
                  Referral code: <span className="text-[#FF9500]">{referralCode}</span>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}