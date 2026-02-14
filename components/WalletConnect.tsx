"use client"

import { useState } from "react"
import { BrowserProvider } from "ethers"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { sessionManager } from "@/lib/auth/session-manager"
import { Loader2 } from "lucide-react"

// Типы уже объявлены в lib/web3/ethereum.ts

interface WalletConnectProps {
  onConnect?: (address: string) => void
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const connectWallet = async () => {
    try {
      setIsConnecting(true)
      setError(null)

      // Проверяем наличие Web3 провайдера
      if (!window.ethereum) {
        throw new Error("Please install MetaMask or another Web3 wallet")
      }

      console.log("[WalletConnect] Requesting accounts...")

      // 1. Запрашиваем доступ к аккаунтам
      const provider = new BrowserProvider(window.ethereum)
      const accounts = await provider.send("eth_requestAccounts", [])

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found")
      }

      const walletAddress = accounts[0]
      console.log("[WalletConnect] Connected to wallet:", walletAddress.slice(0, 10) + "...")

      // 2. Получаем nonce от сервера
      console.log("[WalletConnect] Fetching nonce...")
      const nonceResponse = await fetch("/api/auth/wallet", {
        method: "GET",
        credentials: "include",
      })

      if (!nonceResponse.ok) {
        throw new Error("Failed to get authentication nonce")
      }

      const { nonce } = await nonceResponse.json()
      console.log("[WalletConnect] Nonce received:", nonce.slice(0, 8) + "...")

      // 3. Генерируем сообщение для подписи (должно совпадать с backend!)
      const message = `Welcome to Kabbalah Code Game!

Click "Sign" to authenticate your wallet.

Wallet: ${walletAddress}
Nonce: ${nonce}

This request will not trigger a blockchain transaction or cost any gas fees.`

      console.log("[WalletConnect] Message for signing:", message)

      // 4. Запрашиваем подпись
      console.log("[WalletConnect] Requesting signature...")
      const signer = await provider.getSigner()
      const signature = await signer.signMessage(message)
      console.log("[WalletConnect] Signature received:", signature.slice(0, 20) + "...")

      // 5. Отправляем подпись на сервер для верификации
      console.log("[WalletConnect] Sending authentication request...")
      const authResponse = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          walletAddress,
          signature,
          nonce, // ✅ Отправляем nonce, а не message!
        }),
      })

      if (!authResponse.ok) {
        const errorData = await authResponse.json()
        console.error("[WalletConnect] Authentication failed:", errorData)
        throw new Error(errorData.error || "Authentication failed")
      }

      const { user, session } = await authResponse.json()
      console.log("[WalletConnect] Authentication successful!", {
        userId: user.id,
        wallet: user.wallet_address,
        walletNumber: user.wallet_number
      })

      // 7. Инициализируем session manager
      const sessionInitialized = await sessionManager.initializeFromAuth(
        {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at || 0,
          user: session.user
        },
        user.id
      )

      if (!sessionInitialized) {
        console.warn("[WalletConnect] ⚠️ Session manager initialization failed")
        setError("Session initialization failed. Please try again.")
        return
      }

      // 8. Сохраняем данные в localStorage для дашборда (как fallback)
      const walletData = {
        address: walletAddress,
        walletNumber: user.wallet_number || 1,
        connectedAt: Date.now()
      }
      
      try {
        localStorage.setItem("kabbalah_wallet", JSON.stringify(walletData))
        localStorage.setItem("kabbalah_user_id", user.id) // Сохраняем user ID для аутентификации
        console.log("[WalletConnect] ✅ Wallet data and user ID saved")
      } catch (storageError) {
        console.warn("[WalletConnect] ⚠️ localStorage fallback failed:", storageError)
      }

      // 9. Успешная аутентификация
      console.log("[WalletConnect] ✅ Authentication successful!")

      // Небольшая задержка перед редиректом, чтобы localStorage успел сохраниться
      setTimeout(() => {
        console.log("[WalletConnect] Redirecting to dashboard...")
        router.push("/dashboard")
      }, 200)
    } catch (err) {
      console.error("[WalletConnect] Connection error:", err)
      setError(err instanceof Error ? err.message : "Failed to connect wallet")
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={connectWallet} disabled={isConnecting} size="lg" className="w-full">
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          "Connect Wallet"
        )}
      </Button>

      {error && <div className="text-sm text-red-500 text-center">{error}</div>}
    </div>
  )
}