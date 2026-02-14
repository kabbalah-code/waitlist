import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { calculateLevel } from "@/lib/db/users"
import { rewardUserWithKcode } from "@/lib/web3/backend-contracts"

/**
 * POST /api/tasks/verify-direct
 * Direct task verification endpoint (bypasses middleware)
 * Used for Twitter and other social media task verification
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[API] POST /api/tasks/verify-direct")

    // Get request body
    const body = await request.json()
    const { taskId, taskType, tweetUrl, walletAddress, userId } = body
    
    console.log("[API] Request:", { 
      taskId, 
      taskType, 
      hasWallet: !!walletAddress,
      hasUserId: !!userId 
    })

    // Validate required fields
    if (!taskId || !walletAddress || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields: taskId, walletAddress, userId" 
      }, { status: 400 })
    }

    // Create Supabase client
    const supabase = await createClient()

    // Get user by ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      console.error("[API] User lookup error:", userError)
      return NextResponse.json({ 
        success: false, 
        error: "User not found: " + (userError?.message || "No user data")
      }, { status: 404 })
    }

    // Verify wallet matches
    if (user.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ 
        success: false, 
        error: "Wallet address mismatch" 
      }, { status: 401 })
    }

    console.log("[API] User verified:", user.id)

    // Get task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, tokens, task_type, is_active")
      .eq("id", taskId)
      .single()

    if (taskError || !task) {
      console.error("[API] Task lookup error:", taskError)
      return NextResponse.json({ 
        success: false, 
        error: "Task not found" 
      }, { status: 404 })
    }

    if (!task.is_active) {
      return NextResponse.json({ 
        success: false, 
        error: "Task is not active" 
      }, { status: 400 })
    }

    console.log("[API] Task found:", task.title)

    // Check if already completed
    const { data: existingTask, error: checkError } = await supabase
      .from("tasks_completion")
      .select("id")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .maybeSingle()

    if (checkError) {
      console.error("[API] Completion check error:", checkError)
      return NextResponse.json({ 
        success: false, 
        error: "Database error checking completion" 
      }, { status: 500 })
    }

    if (existingTask) {
      return NextResponse.json({ 
        success: false, 
        error: "Task already completed" 
      }, { status: 400 })
    }

    // TODO: Add real Twitter verification here
    // For now, we'll accept any task completion
    // In production, you should verify:
    // - Twitter follow status via Twitter API
    // - Tweet engagement (like, retweet, comment) via Twitter API
    // - Tweet content contains required hashtags/mentions

    const kcodeReward = task.tokens || 0

    if (kcodeReward <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Task has no reward" 
      }, { status: 400 })
    }

    console.log("[API] Awarding KCODE:", kcodeReward)

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

    // Update user total_kcode and level
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
      console.error("[API] User update error:", updateError)
      // Don't fail - tokens already minted
    }

    // Record task completion
    const { error: completionError } = await supabase
      .from("tasks_completion")
      .insert({
        user_id: user.id,
        task_id: taskId,
        task_type: task.task_type,
        kcode_earned: kcodeReward,
        tx_hash: txHash,
      })

    if (completionError) {
      console.error("[API] Completion record error:", completionError)
      
      // Rollback user KCODE (tokens already minted on-chain, but we can adjust database)
      await supabase
        .from("users")
        .update({
          total_kcode: user.total_kcode,
          level: user.level,
          tokens_minted: user.tokens_minted,
        })
        .eq("id", user.id)
      
      return NextResponse.json({ 
        success: false, 
        error: "Failed to record task completion" 
      }, { status: 500 })
    }

    // Record KCODE transaction
    const { error: transactionError } = await supabase
      .from("kcode_transactions")
      .insert({
        user_id: user.id,
        amount: kcodeReward,
        type: "task_completion",
        description: `Task: ${task.title}`,
        tx_hash: txHash,
        metadata: {
          task_id: taskId,
          task_type: task.task_type,
          tweet_url: tweetUrl,
        },
      })

    if (transactionError) {
      console.error("[API] Transaction record error:", transactionError)
    }

    console.log("[API] Success!")

    return NextResponse.json({
      success: true,
      kcode: kcodeReward,
      newTotal,
      newLevel,
      transactionHash: txHash,
      message: `Task completed! You earned ${kcodeReward} KCODE`
    })

  } catch (error) {
    console.error("[API] Unexpected error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error")
    }, { status: 500 })
  }
}
