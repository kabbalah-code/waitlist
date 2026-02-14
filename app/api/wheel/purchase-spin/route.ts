import { type NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"
import { KCODE_REWARDS } from "@/lib/points/calculator"
import { z } from "zod"

// Zod schema для валидации
const purchaseSpinSchema = z.object({
  walletAddress: z.string().min(1, "Wallet address required"),
  transactionHash: z.string().min(1, "Transaction hash required"),
})

export async function POST(request: NextRequest) {
  try {
    // ✅ КРИТИЧНО: Получаем userId из headers (установлен middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please authenticate first." },
        { status: 401 }
      )
    }

    // Валидация request body
    const body = await request.json()
    const validationResult = purchaseSpinSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { walletAddress, transactionHash } = validationResult.data
    const spinCost = KCODE_REWARDS.EXTRA_SPIN_COST // 1 KCODE

    console.log("[API] POST /api/wheel/purchase-spin", {
      userId: userId.slice(0, 10) + "...",
      walletAddress: walletAddress.slice(0, 10) + "...",
      transactionHash: transactionHash.slice(0, 10) + "...",
      cost: spinCost,
    })

    // ✅ Rate limiting по userId
    const rateLimit = checkRateLimit(userId, "WHEEL_SPIN")
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
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        }
      )
    }

    // Use service role key for server-side operations
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ✅ Получаем user по userId из authenticated session
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      console.error("[API] User not found:", userId, userError)
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Verify wallet address matches user
    if (user.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ 
        success: false, 
        error: "Wallet address mismatch" 
      }, { status: 400 })
    }

    // NOTE: User already paid with MetaMask (tokens sent to burn address on frontend)
    // We just need to verify the transaction and add free spin
    
    console.log(`[API] ✅ User paid ${spinCost} KCODE via MetaMask. TX: ${transactionHash}`)

    // Record blockchain transaction
    const { error: txError } = await supabase
      .from("blockchain_transactions")
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        contract_address: process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS || '',
        transaction_hash: transactionHash,
        transaction_type: 'wheel_spin_purchase',
        amount: spinCost.toString(),
        status: 'confirmed',
        description: 'Wheel spin purchase (paid via MetaMask)'
      })

    if (txError) {
      console.error("[API] Error recording transaction:", txError)
      // Don't fail - user already paid
    }

    // Update user: add free spin (DON'T deduct total_kcode - user paid with MetaMask!)
    const { error: updateError } = await supabase
      .from("users")
      .update({
        free_spins: user.free_spins + 1
      })
      .eq("id", userId)

    if (updateError) {
      console.error("[API] Error updating user:", updateError)
      // Don't fail - tokens already burned
    }

    // Record blockchain transaction in kcode_transactions for history
    // NOTE: We don't record negative amount because user paid from MetaMask, not database balance
    const { error: kcodeError } = await supabase.from("kcode_transactions").insert({
      user_id: userId,
      amount: 0, // No change to database balance
      type: "wheel_spin_purchase",
      description: `Purchased wheel spin via MetaMask`,
      tx_hash: transactionHash,
      metadata: {
        tokens_spent: spinCost,
        payment_method: 'metamask'
      }
    })

    if (kcodeError) {
      console.error("[API] Error recording KCODE transaction:", kcodeError)
    }

    return NextResponse.json({
      success: true,
      data: {
        transactionHash: transactionHash,
        tokensSpent: spinCost,
        freeSpinsAdded: 1,
        newFreeSpins: user.free_spins + 1,
        newKcodeBalance: user.total_kcode, // Balance unchanged - paid with MetaMask
        message: "Wheel spin purchased successfully!"
      }
    })

  } catch (error) {
    console.error("[API] Error in POST /api/wheel/purchase-spin:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to purchase spin"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}