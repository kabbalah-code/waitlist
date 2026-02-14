// Web3 Ethereum utilities
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
      isMetaMask?: boolean
      providers?: Array<{
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
        isMetaMask?: boolean
        isPhantom?: boolean
      }>
    }
  }
}

export interface WalletConnection {
  address: string
  chainId: number
}

export function isMetaMaskInstalled(): boolean {
  if (typeof window === "undefined") return false
  
  // Check for MetaMask specifically
  if (window.ethereum?.isMetaMask) return true
  
  // Check in providers array if multiple wallets are installed
  if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
    return window.ethereum.providers.some((provider: any) => provider.isMetaMask)
  }
  
  return false
}

export function isPreviewEnvironment(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.self !== window.top || window.location.hostname.includes("vercel.app")
  } catch {
    return true // In an iframe
  }
}

// Connect to MetaMask
export async function connectMetaMask(): Promise<WalletConnection> {
  if (typeof window === "undefined") {
    throw new Error("Cannot connect on server side")
  }

  if (!window.ethereum) {
    throw new Error("METAMASK_NOT_INSTALLED")
  }

  try {
    // Handle multiple wallet extensions
    let ethereum = window.ethereum
    
    // If multiple wallets are detected, try to select MetaMask specifically
    if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
      const metamaskProvider = window.ethereum.providers.find((provider: any) => provider.isMetaMask)
      if (metamaskProvider) {
        ethereum = metamaskProvider
      }
    }

    const accounts = (await ethereum.request({
      method: "eth_requestAccounts",
    })) as string[]

    const chainId = (await ethereum.request({
      method: "eth_chainId",
    })) as string

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found")
    }

    return {
      address: accounts[0],
      chainId: Number.parseInt(chainId, 16),
    }
  } catch (err: unknown) {
    // Handle user rejection
    if (err && typeof err === "object" && "code" in err && err.code === 4001) {
      throw new Error("User rejected the connection request")
    }
    
    // Handle extension conflicts
    if (err && typeof err === "object" && "message" in err) {
      const message = (err as any).message
      if (message.includes("disconnected port") || message.includes("service worker")) {
        throw new Error("Wallet extension conflict detected. Please disable other wallet extensions or refresh the page.")
      }
    }
    
    throw err
  }
}

// Get current account
export async function getCurrentAccount(): Promise<string | null> {
  if (!window.ethereum) return null

  try {
    const accounts = (await window.ethereum.request({
      method: "eth_accounts",
    })) as string[]
    return accounts[0] || null
  } catch {
    return null
  }
}

// Sign message for authentication
export async function signMessage(address: string, message: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed")
  }

  try {
    // Handle multiple wallet extensions
    let ethereum = window.ethereum
    
    // If multiple wallets are detected, try to select MetaMask specifically
    if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
      const metamaskProvider = window.ethereum.providers.find((provider: any) => provider.isMetaMask)
      if (metamaskProvider) {
        ethereum = metamaskProvider
      }
    }

    const signature = (await ethereum.request({
      method: "personal_sign",
      params: [message, address],
    })) as string

    return signature
  } catch (err: unknown) {
    // Handle extension conflicts
    if (err && typeof err === "object" && "message" in err) {
      const message = (err as any).message
      if (message.includes("disconnected port") || message.includes("service worker")) {
        throw new Error("Wallet extension conflict detected. Please disable other wallet extensions or refresh the page.")
      }
    }
    throw err
  }
}

// Generate nonce for SIWE
export function generateNonce(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

// Create SIWE message
export function createSiweMessage(address: string, nonce: string, chainId = 1): string {
  const domain = typeof window !== "undefined" ? window.location.host : "kabbalahcode.app"
  const uri = typeof window !== "undefined" ? window.location.origin : "https://kabbalahcode.app"
  const issuedAt = new Date().toISOString()

  return `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in to Kabbalah Code - Unlock the Ancient Wisdom of Numbers

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`
}

// Validate EVM address
export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Format address for display
export function formatAddress(address: string): string {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Calculate wallet number (gematria-style)
export function calculateWalletNumber(address: string): number {
  if (!isValidEvmAddress(address)) return 0

  // Remove 0x prefix
  const hex = address.slice(2).toLowerCase()

  // Sum all hex digits
  let sum = 0
  for (const char of hex) {
    const value = Number.parseInt(char, 16)
    sum += value
  }

  // Reduce to single digit (Kabbalistic reduction)
  while (sum > 9) {
    sum = sum
      .toString()
      .split("")
      .reduce((acc, d) => acc + Number.parseInt(d), 0)
  }

  return sum
}
