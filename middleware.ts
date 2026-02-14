import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // ===== WAITLIST MODE =====
  const isWaitlistEnabled = process.env.NEXT_PUBLIC_WAITLIST_ENABLED === 'true';
  
  if (isWaitlistEnabled) {
    // Block dashboard access during waitlist mode
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Allow waitlist API endpoints
    if (request.nextUrl.pathname.startsWith('/api/waitlist')) {
      return NextResponse.next();
    }
  }

  // ===== ЗАЩИТА API ROUTES =====
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const publicEndpoints = [
      "/api/auth/wallet",
      "/api/auth/twitter",
      "/api/auth/twitter/callback",
      "/api/auth/discord/oauth",      // Discord OAuth start
      "/api/auth/discord/callback",   // Discord OAuth callback
      "/api/auth/telegram/oauth",     // Telegram OAuth start  
      "/api/auth/telegram/callback",  // Telegram OAuth callback
      "/api/internal/",
      "/api/health",
      "/api/admin/",                  // Admin endpoints have their own auth check
      "/api/tasks/verify-direct", // Direct API bypass
      "/api/tasks/verify-emergency", // Emergency bypass
      "/api/telegram/verify-direct", // Telegram direct API (deprecated)
      "/api/telegram/verify-secure", // Telegram secure verification (new)
      "/api/waitlist/",               // Waitlist endpoints
      // "/api/telegram/verify-bot", // Telegram Bot API verification - REMOVED from public
    ]

    const isPublicEndpoint = publicEndpoints.some((path) => request.nextUrl.pathname.startsWith(path))

    if (!isPublicEndpoint) {
      // Проверяем localStorage через заголовки
      const walletAddress = request.headers.get('x-wallet-address')
      const userIdFromStorage = request.headers.get('x-user-id-storage')
      
      console.log("[Middleware] 🔍 Checking auth for:", request.nextUrl.pathname)
      console.log("[Middleware] 📥 Headers received:", { 
        hasWallet: !!walletAddress, 
        hasUserId: !!userIdFromStorage,
        wallet: walletAddress?.slice(0, 10) + "...",
        userId: userIdFromStorage?.slice(0, 8) + "...",
        allHeaders: Object.fromEntries(request.headers.entries())
      })
      
      if (!walletAddress || !userIdFromStorage) {
        console.log("[Middleware] ❌ UNAUTHORIZED - Missing auth headers")
        console.log("[Middleware] 🔍 Available headers:", Array.from(request.headers.keys()))
        return NextResponse.json({ 
          error: "Unauthorized. Please authenticate first.",
          debug: {
            path: request.nextUrl.pathname,
            hasWalletHeader: !!walletAddress,
            hasUserIdHeader: !!userIdFromStorage,
            timestamp: new Date().toISOString(),
            receivedHeaders: Array.from(request.headers.keys())
          }
        }, { status: 401 })
      }

      // Create new headers with auth info for the API route
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-user-id", userIdFromStorage)
      requestHeaders.set("x-wallet-address", walletAddress)

      console.log("[Middleware] ✅ AUTHORIZED:", {
        path: request.nextUrl.pathname,
        userId: userIdFromStorage.slice(0, 8) + "...",
        wallet: walletAddress.slice(0, 10) + "..."
      })

      // Return response with modified request headers
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }
  }

  // For non-API routes or public endpoints, continue normally
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}