import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// ⚠️ EMERGENCY BYPASS API - ONLY FOR DEVELOPMENT
// This API bypasses all security checks and should be DISABLED in production
export async function POST(request: NextRequest) {
  // 🔒 DISABLE IN PRODUCTION
  const isProduction = process.env.NODE_ENV === 'production'
  const emergencyEnabled = process.env.ENABLE_EMERGENCY_API === 'true'
  
  if (isProduction || !emergencyEnabled) {
    console.log("[EMERGENCY] ❌ Emergency API is disabled")
    return NextResponse.json(
      { success: false, error: 'Emergency API is disabled. Use /api/tasks/verify-direct instead.' },
      { status: 403 }
    )
  }

  try {
    console.log("[EMERGENCY] POST /api/tasks/verify-emergency")
    console.log("[EMERGENCY] ⚠️ WARNING: This API bypasses all security checks!")

    // Get request body
    const body = await request.json()
    const { taskId, taskType, tweetUrl, walletAddress, userId } = body
    
    console.log("[EMERGENCY] Request:", { 
      taskId, 
      taskType, 
      walletAddress: walletAddress?.slice(0, 10) + "...",
      userId: userId?.slice(0, 8) + "...",
      tweetUrl: tweetUrl?.slice(0, 30) + "...",
      fullUserId: userId
    })

    // Use provided user credentials instead of hardcoded admin
    const providedUserId = userId || "7b919b55-0db2-40d6-8031-724983b66c98"

    // Create Supabase admin client (bypasses RLS)
    const supabase = createAdminClient()

    console.log("[EMERGENCY] Using provided user credentials, looking for ID:", providedUserId)

    // Get user by provided ID
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", providedUserId)

    console.log("[EMERGENCY] User query result:", { 
      users: users?.length || 0, 
      error: userError?.message || 'none' 
    })

    if (userError) {
      console.error("[EMERGENCY] User lookup error:", userError)
      return NextResponse.json({ 
        success: false, 
        error: "Database error: " + userError.message
      }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "User not found"
      }, { status: 404 })
    }

    const user = users[0]
    console.log("[EMERGENCY] User found:", {
      id: user.id,
      wallet: user.wallet_address,
      points: user.total_points
    })

    // Get task details
    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single()

    if (taskError || !tasks) {
      console.error("[EMERGENCY] Task lookup error:", taskError)
      return NextResponse.json({ 
        success: false, 
        error: "Task not found"
      }, { status: 404 })
    }

    const task = tasks
    console.log("[EMERGENCY] Task found:", {
      id: task.id,
      title: task.title,
      points: task.points
    })

    // Check if already completed - check by task_id
    const { data: existingCompletion, error: completionCheckError } = await supabase
      .from("tasks_completion")
      .select("*")
      .eq("user_id", user.id)
      .eq("task_id", taskId) // ✅ ИСПРАВЛЕНО: проверка по task_id

    if (completionCheckError) {
      console.error("[EMERGENCY] Completion check error:", completionCheckError)
      // Don't fail the request, continue with completion
      console.log("[EMERGENCY] Continuing despite completion check error...")
    }

    if (existingCompletion && existingCompletion.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Task already completed"
      }, { status: 400 })
    }

    // Verify Twitter task
    if (task && task.task_type && task.task_type.startsWith('twitter') && tweetUrl) {
      // Basic URL validation
      if (!tweetUrl.includes('twitter.com') && !tweetUrl.includes('x.com')) {
        return NextResponse.json({ 
          success: false, 
          error: "Please provide a valid Twitter/X URL" 
        }, { status: 400 })
      }

      // Extract tweet ID for basic validation
      const tweetIdMatch = tweetUrl.match(/status\/(\d+)/)
      if (!tweetIdMatch) {
        return NextResponse.json({ 
          success: false, 
          error: "Invalid tweet URL format. Please use a valid Twitter/X status URL." 
        }, { status: 400 })
      }

      console.log("[EMERGENCY] Tweet URL validated:", tweetIdMatch[1])
    }
    const points = task.points
    const newTotal = user.total_points + points
    const newAvailable = user.available_points + points

    // Calculate KCODE tokens to mint (1 token per 100 points)
    const tokensToMint = Math.floor(points / 100)
    
    if (tokensToMint > 0) {
      try {
        // Check max supply limit
        const MAX_SUPPLY = 1000000 // 1M KCODE tokens
        const { data: totalMinted } = await supabase
          .from("token_transactions")
          .select("amount")
          .eq("transaction_type", "mint")
        
        const currentSupply = totalMinted?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0
        
        if (currentSupply + tokensToMint > MAX_SUPPLY) {
          console.log("[EMERGENCY] Max supply reached, no tokens minted")
        } else {
          // Mint KCODE tokens to user wallet
          const { mintTokens } = require('@/lib/web3/contracts')
          await mintTokens(user.wallet_address, tokensToMint)
          console.log("[EMERGENCY] Minted", tokensToMint, "KCODE tokens to", user.wallet_address)
        }
      } catch (mintError) {
        console.error("[EMERGENCY] Token minting failed:", mintError)
        // Continue with points award even if minting fails
      }
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        total_points: newTotal,
        available_points: newAvailable,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[EMERGENCY] Points update error:", updateError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to update points"
      }, { status: 500 })
    }

    console.log("[EMERGENCY] Points updated:", {
      oldTotal: user.total_points,
      newTotal: newTotal,
      pointsAwarded: points
    })

    // Record completion - use existing table structure
    const { error: completionError } = await supabase
      .from("tasks_completion")
      .insert({
        user_id: user.id,
        task_id: taskId, // ✅ ИСПРАВЛЕНО: добавлен task_id
        task_type: taskType,
        points_earned: points,
        task_data: {
          taskId: taskId,
          tweetUrl: tweetUrl,
          verifiedAt: new Date().toISOString(),
          method: "emergency_bypass"
        }
      })

    if (completionError) {
      console.error("[EMERGENCY] Completion error:", completionError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to record completion"
      }, { status: 500 })
    }

    // Record token transaction in database
    if (tokensToMint > 0) {
      const { error: tokenTxError } = await supabase
        .from("token_transactions")
        .insert({
          user_id: user.id,
          transaction_hash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
          transaction_type: "mint",
          amount: tokensToMint.toString(),
          to_address: user.wallet_address,
          status: "confirmed",
          description: `Task reward: ${task.title}`,
        })

      if (tokenTxError) {
        console.error("[EMERGENCY] Token transaction record error:", tokenTxError)
      }
    }

    // Record points transaction
    const { error: transactionError } = await supabase
      .from("points_transactions")
      .insert({
        user_id: user.id,
        amount: points,
        type: "task_completion",
        description: `Task: ${task.title} (Emergency)`,
      })

    if (transactionError) {
      console.error("[EMERGENCY] Transaction error:", transactionError)
      // Don't fail the request for transaction logging errors
    }

    console.log("[EMERGENCY] Task completed successfully!")

    return NextResponse.json({
      success: true,
      points: points,
      newTotal: newTotal,
      newAvailable: newAvailable,
      taskTitle: task.title,
      message: "Task completed successfully (Emergency Mode)!"
    })

  } catch (error) {
    console.error("[EMERGENCY] Unexpected error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error")
    }, { status: 500 })
  }
}