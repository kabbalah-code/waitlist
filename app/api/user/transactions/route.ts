import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserByWallet } from "@/lib/db/users"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"

export async function GET(request: NextRequest) {
  try {
    // ✅ КРИТИЧНО: Получаем userId из headers (установлен middleware)
    let userId = request.headers.get("x-user-id")
    let walletAddress = request.headers.get("x-wallet-address")
    
    // ✅ FALLBACK: If middleware headers missing, try storage headers
    if (!userId || !walletAddress) {
      userId = request.headers.get("x-user-id-storage")
      walletAddress = request.headers.get("x-wallet-address")
    }
    
    if (!userId || !walletAddress) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please authenticate first." },
        { status: 401 }
      )
    }

    // ✅ Rate limiting по userId
    const rateLimit = checkRateLimit(userId, "API_GENERAL")
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(rateLimit.resetIn / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetIn / 1000).toString(),
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        },
      )
    }

    console.log("[API] GET /api/user/transactions", { userId: userId.slice(0, 8) + "..." })

    let supabase
    try {
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    } catch (error) {
      console.error("[API] Supabase client error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Database not configured. Please set up Supabase environment variables.",
        },
        { status: 500 },
      )
    }

    // ✅ Получаем транзакции по userId напрямую
    const { data: transactions, error: transactionsError } = await supabase
      .from("kcode_transactions")
      .select("id, amount, type, description, created_at, metadata, user_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (transactionsError) {
      console.error("[API] Error fetching transactions:", transactionsError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    console.log("[API] ✅ Found", transactions?.length || 0, "transactions")

    return NextResponse.json({ success: true, transactions: transactions || [] })
  } catch (error) {
    console.error("[API] Error in GET /api/user/transactions:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch transactions"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
