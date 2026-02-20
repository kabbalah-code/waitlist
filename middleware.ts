import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// CSP Header for all environments
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://va.vercel-scripts.com https://static.cloudflareinsights.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https: blob: https://api.web3modal.org https://api.web3modal.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://*.vercel-insights.com https://*.vercel-analytics.com wss://*.supabase.co https://challenges.cloudflare.com https://polygon-rpc.com https://rpc.ankr.com https://cloudflareinsights.com https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://rpc.walletconnect.com https://rpc.walletconnect.org https://relay.walletconnect.com https://pulse.walletconnect.com https://pulse.walletconnect.org https://api.web3modal.com https://api.web3modal.org https://rpc-amoy.polygon.technology https://cca-lite.coinbase.com https://*.coinbase.com https://keys.coinbase.com https://vercel.live",
  "frame-src 'self' https://challenges.cloudflare.com https://verify.walletconnect.com https://verify.walletconnect.org https://secure.walletconnect.com https://secure.walletconnect.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

export async function middleware(request: NextRequest) {
  // Create response
  let response = NextResponse.next()
  
  // Add CSP headers for all requests (including development)
  response.headers.set('Content-Security-Policy', cspHeader)
  
  // ===== WAITLIST MODE =====
  const isWaitlistEnabled = process.env.NEXT_PUBLIC_WAITLIST_ENABLED === 'true';
  
  if (isWaitlistEnabled) {
    // Block dashboard access during waitlist mode
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      response = NextResponse.redirect(new URL('/', request.url));
      response.headers.set('Content-Security-Policy', cspHeader);
      return response;
    }
    
    // Allow waitlist API endpoints
    if (request.nextUrl.pathname.startsWith('/api/waitlist')) {
      return response;
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
        const errorResponse = NextResponse.json({ 
          error: "Unauthorized. Please authenticate first.",
          debug: {
            path: request.nextUrl.pathname,
            hasWalletHeader: !!walletAddress,
            hasUserIdHeader: !!userIdFromStorage,
            timestamp: new Date().toISOString(),
            receivedHeaders: Array.from(request.headers.keys())
          }
        }, { status: 401 })
        errorResponse.headers.set('Content-Security-Policy', cspHeader)
        return errorResponse
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
      response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
      response.headers.set('Content-Security-Policy', cspHeader)
      return response
    }
  }

  // For non-API routes or public endpoints, continue normally
  return response
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}