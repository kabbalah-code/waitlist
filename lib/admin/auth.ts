// Admin authentication - проверка адреса кошелька админа
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"

// Whitelist админов (в production хранить в .env или БД)
const ADMIN_ADDRESSES = (process.env.ADMIN_WALLET_ADDRESSES || "")
  .split(",")
  .map((addr) => addr.toLowerCase().trim())
  .filter(Boolean)

/**
 * Check if wallet address is admin
 */
export function isAdmin(walletAddress: string): boolean {
  if (!walletAddress || !isValidEvmAddress(walletAddress)) {
    console.log("[isAdmin] Invalid wallet address:", walletAddress)
    return false
  }

  const normalized = walletAddress.toLowerCase()
  const adminAddresses = (process.env.ADMIN_WALLET_ADDRESSES || "")
    .split(",")
    .map((addr) => addr.toLowerCase().trim())
    .filter(Boolean)
  
  console.log("[isAdmin] Checking wallet:", normalized)
  console.log("[isAdmin] Admin addresses from env:", adminAddresses)
  console.log("[isAdmin] Match result:", adminAddresses.includes(normalized))
  
  return adminAddresses.includes(normalized)
}

/**
 * Verify admin signature (for future use)
 */
export async function verifyAdminSignature(
  address: string,
  signature: string,
  message: string,
): Promise<boolean> {
  // TODO: Implement signature verification
  // For now, just check if address is in whitelist
  return isAdmin(address)
}


