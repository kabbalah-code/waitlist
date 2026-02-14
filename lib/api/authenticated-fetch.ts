/**
 * Authenticated Fetch - NUCLEAR VERSION
 * Гарантированно работающая версия
 */

interface AuthenticatedFetchOptions extends RequestInit {
  walletAddress?: string
  userId?: string
}

export async function authenticatedFetch(
  url: string, 
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const { walletAddress, userId, headers = {}, ...fetchOptions } = options
  
  // Создаем заголовки для аутентификации
  const authHeaders: Record<string, string> = {
    ...headers as Record<string, string>
  }
  
  // Если есть данные для localStorage аутентификации, добавляем заголовки
  if (walletAddress && userId) {
    authHeaders["x-wallet-address"] = walletAddress
    authHeaders["x-user-id-storage"] = userId // Возвращаем обратно для совместимости с middleware
    console.log("[AuthFetch] ✅ Adding auth headers:", { walletAddress: walletAddress.slice(0, 10) + "...", userId: userId.slice(0, 8) + "..." })
  }
  
  // Добавляем credentials для cookies
  const finalOptions = {
    ...fetchOptions,
    headers: authHeaders,
    credentials: 'include' as RequestCredentials
  }
  
  console.log("[AuthFetch] Making request to:", url, "with headers:", Object.keys(authHeaders))
  
  return fetch(url, finalOptions)
}

export function getStoredAuthData(): { walletAddress: string; userId: string } | null {
  try {
    const walletData = localStorage.getItem("kabbalah_wallet")
    const userId = localStorage.getItem("kabbalah_user_id")
    
    if (walletData && userId) {
      // Parse the JSON wallet data
      const parsed = JSON.parse(walletData)
      console.log("[AuthFetch] ✅ Found stored auth data:", { 
        walletAddress: parsed.address.slice(0, 10) + "...", 
        userId: userId.slice(0, 8) + "..." 
      })
      return {
        walletAddress: parsed.address.toLowerCase(), // Normalize to lowercase
        userId: userId
      }
    } else {
      console.log("[AuthFetch] ❌ No stored auth data found")
    }
  } catch (error) {
    console.error("[AuthFetch] Error getting stored auth data:", error)
  }
  
  return null
}

export async function apiCall(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authData = getStoredAuthData()
  
  if (!authData) {
    console.error("[AuthFetch] ❌ No auth data available for API call")
    console.error("[AuthFetch] localStorage contents:", {
      wallet: localStorage.getItem("kabbalah_wallet"),
      userId: localStorage.getItem("kabbalah_user_id")
    })
    throw new Error("Authentication required. Please connect your wallet.")
  }
  
  console.log("[AuthFetch] 🔍 Making API call to:", url)
  console.log("[AuthFetch] 📤 Auth data:", {
    wallet: authData.walletAddress.slice(0, 10) + "...",
    userId: authData.userId.slice(0, 8) + "..."
  })
  
  return authenticatedFetch(url, {
    ...options,
    walletAddress: authData.walletAddress,
    userId: authData.userId
  })
}