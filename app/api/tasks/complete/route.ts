import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { calculateLevel } from "@/lib/db/users"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"
import { rewardUserWithKcode } from "@/lib/web3/backend-contracts"
import { z } from "zod"

// Zod schema для валидации
const taskCompleteSchema = z.object({
  taskId: z.string().min(1, "Task ID required"),
  taskType: z.string().optional(),
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

    // Валидация входных данных
    const body = await request.json()
    const validationResult = taskCompleteSchema.safeParse(body)

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

    const { taskId, taskType } = validationResult.data

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
        }
      )
    }

    console.log("[API] POST /api/tasks/complete", { userId: userId.slice(0, 10) + "...", taskId })

    let supabase
    try {
      supabase = await createClient()
    } catch (error) {
      console.error("[API] Supabase client error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Database not configured. Please set up Supabase environment variables.",
        },
        { status: 500 }
      )
    }

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

    // ✅ Check if task already completed (by task_id, not task_type)
    const { data: existing, error: checkError } = await supabase
      .from("tasks_completion")
      .select("id")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .maybeSingle()

    if (checkError) {
      console.error("[API] Error checking existing task:", checkError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ success: false, error: "Task already completed" }, { status: 400 })
    }

    // Get task details from database
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, tokens, task_type, is_active")
      .eq("id", taskId)
      .single()

    if (taskError || !task) {
      console.error("[API] Task not found:", taskId, taskError)
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    if (!task.is_active) {
      return NextResponse.json({ success: false, error: "Task is not active" }, { status: 400 })
    }

    const kcodeReward = task.tokens || 0

    if (kcodeReward <= 0) {
      return NextResponse.json({ success: false, error: "Invalid task or task has no reward" }, { status: 400 })
    }

    // ✅ REWARD USER WITH KCODE TOKENS ON-CHAIN!
    let txHash: string | undefined
    try {
      txHash = await rewardUserWithKcode(
        user.wallet_address,
        kcodeReward,
        `Task: ${task.title}`
      )
      console.log(`[API] ✅ Rewarded ${kcodeReward} KCODE to ${user.wallet_address}. TX: ${txHash}`)
    } catch (contractError) {
      console.error("[API] Error rewarding KCODE on-chain:", contractError)
      return NextResponse.json(
        { success: false, error: "Failed to mint tokens on blockchain" },
        { status: 500 }
      )
    }

    // ✅ Record task completion with task_id and kcode_earned
    const { error: completionError } = await supabase.from("tasks_completion").insert({
      user_id: user.id,
      task_id: taskId,
      task_type: task.task_type,
      kcode_earned: kcodeReward,
      tx_hash: txHash,
    })

    if (completionError) {
      console.error("[API] Error recording task completion:", completionError)
      return NextResponse.json({ success: false, error: "Failed to record task completion" }, { status: 500 })
    }

    // ✅ Update user total_kcode and level
    const newTotal = user.total_kcode + kcodeReward
    const newLevel = calculateLevel(newTotal)

    const { error: updateError } = await supabase
      .from("users")
      .update({
        total_kcode: newTotal,
        level: newLevel,
        tokens_minted: user.tokens_minted + kcodeReward,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[API] Error updating user KCODE:", updateError)
      // Don't rollback - tokens already minted on-chain
    }

    // ✅ Record transaction
    const { error: transactionError } = await supabase.from("kcode_transactions").insert({
      user_id: user.id,
      amount: kcodeReward,
      type: "task_completion",
      description: `Completed: ${task.title}`,
      tx_hash: txHash,
      metadata: {
        task_id: taskId,
        task_type: task.task_type,
      },
    })

    if (transactionError) {
      console.error("[API] Error recording transaction:", transactionError)
    }

    return NextResponse.json({
      success: true,
      kcode: kcodeReward,
      newTotal,
      newLevel,
      txHash,
      message: `Task completed! You earned ${kcodeReward} KCODE`
    })
  } catch (error) {
    console.error("[API] Error in POST /api/tasks/complete:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to complete task"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
