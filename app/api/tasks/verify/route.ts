import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// DIRECT API - bypasses middleware completely
export async function POST(request: NextRequest) {
  try {
    console.log("[DIRECT API] POST /api/tasks/verify")

    // Get request body first
    const body = await request.json()
    const { taskId, taskType, tweetUrl, walletAddress, userId } = body
    
    console.log("[DIRECT API] Request:", { 
      taskId, 
      taskType, 
      hasWallet: !!walletAddress,
      hasUserId: !!userId 
    })

    // Validate required fields
    if (!taskId || !tweetUrl || !walletAddress || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields: taskId, tweetUrl, walletAddress, userId" 
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
      console.error("[DIRECT API] User lookup error:", userError)
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

    console.log("[DIRECT API] User verified:", user.id)

    // Get task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, points, task_type, is_active")
      .eq("id", taskId)
      .single()

    if (taskError || !task) {
      console.error("[DIRECT API] Task lookup error:", taskError)
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

    console.log("[DIRECT API] Task found:", task.title)

    // Check if already completed
    const { data: existingTask, error: checkError } = await supabase
      .from("tasks_completion")
      .select("id")
      .eq("user_id", user.id)
      .eq("task_type", "follow_twitter") // Fixed for now
      .maybeSingle()

    if (checkError) {
      console.error("[DIRECT API] Completion check error:", checkError)
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

    // Award points (simplified - no tweet verification for now)
    const points = task.points || 100
    const newTotal = user.total_points + points
    const newAvailable = user.available_points + points

    console.log("[DIRECT API] Awarding points:", points)

    // Update user points
    const { error: updateError } = await supabase
      .from("users")
      .update({
        total_points: newTotal,
        available_points: newAvailable,
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[DIRECT API] User update error:", updateError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to update user points" 
      }, { status: 500 })
    }

    // Record task completion
    const { error: completionError } = await supabase
      .from("tasks_completion")
      .insert({
        user_id: user.id,
        task_type: "follow_twitter",
        points_earned: points
      })

    if (completionError) {
      console.error("[DIRECT API] Completion record error:", completionError)
      
      // Rollback user points
      await supabase
        .from("users")
        .update({
          total_points: user.total_points,
          available_points: user.available_points,
        })
        .eq("id", user.id)
      
      return NextResponse.json({ 
        success: false, 
        error: "Failed to record task completion" 
      }, { status: 500 })
    }

    // Record points transaction
    const { error: transactionError } = await supabase
      .from("points_transactions")
      .insert({
        user_id: user.id,
        amount: points,
        type: "task_completion",
        description: `Task: ${task.title}`,
      })

    if (transactionError) {
      console.error("[DIRECT API] Transaction record error:", transactionError)
    }

    console.log("[DIRECT API] Success!")

    return NextResponse.json({
      success: true,
      points,
      newTotal,
      newAvailable,
      message: "Task completed successfully!"
    })

  } catch (error) {
    console.error("[DIRECT API] Unexpected error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error")
    }, { status: 500 })
  }
}