import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Admin middleware to check if user has admin role
 * Used to protect admin-only API endpoints
 */
export async function checkAdminRole(request: NextRequest): Promise<{ isAdmin: boolean; error?: string; user?: any }> {
  try {
    // Get user ID from middleware headers
    const userId = request.headers.get("x-user-id")
    const walletAddress = request.headers.get("x-wallet-address")
    
    if (!userId || !walletAddress) {
      return { isAdmin: false, error: "Unauthorized. Please authenticate first." }
    }

    // Hardcoded admin wallet addresses (temporary solution)
    const ADMIN_WALLETS = [
      '0x0E80D31beA7EdCF68C6173731bd515A9fb3626D4'.toLowerCase()
    ]

    // Check if wallet is in admin list
    if (ADMIN_WALLETS.includes(walletAddress.toLowerCase())) {
      console.log("[Admin Middleware] Admin access granted via wallet whitelist:", walletAddress.slice(0, 10) + "...")
      return { isAdmin: true, user: { id: userId, wallet_address: walletAddress, role: 'admin' } }
    }

    const supabase = await createClient()
    
    // Get user with role (if role column exists)
    const { data: user, error } = await supabase
      .from("users")
      .select("id, wallet_address, role")
      .eq("id", userId)
      .eq("wallet_address", walletAddress)
      .single()

    if (error || !user) {
      console.error("[Admin Middleware] User not found:", error)
      return { isAdmin: false, error: "User not found" }
    }

    // Check if user has admin role (if role column exists)
    const isAdmin = user.role === "admin"
    
    if (!isAdmin) {
      console.log("[Admin Middleware] Access denied for user:", user.wallet_address.slice(0, 10) + "...")
      return { isAdmin: false, error: "Access denied. Admin role required." }
    }

    console.log("[Admin Middleware] Admin access granted:", user.wallet_address.slice(0, 10) + "...")
    return { isAdmin: true, user }

  } catch (error) {
    console.error("[Admin Middleware] Error checking admin role:", error)
    return { isAdmin: false, error: "Internal server error" }
  }
}

/**
 * Helper function to create admin-protected API response
 */
export async function withAdminAuth<T>(
  request: NextRequest,
  handler: (user: any) => Promise<T>
): Promise<Response | T> {
  const { isAdmin, error, user } = await checkAdminRole(request)
  
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ success: false, error }),
      { 
        status: error === "Unauthorized. Please authenticate first." ? 401 : 403,
        headers: { "Content-Type": "application/json" }
      }
    )
  }

  return handler(user)
}