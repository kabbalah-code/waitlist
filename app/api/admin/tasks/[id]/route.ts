import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"
import { isAdmin } from "@/lib/admin/auth"

/**
 * PUT /api/admin/tasks/[id]
 * Updates an existing task (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet")

    if (!wallet || !isValidEvmAddress(wallet)) {
      return NextResponse.json({ success: false, error: "Valid wallet address required" }, { status: 400 })
    }

    if (!isAdmin(wallet)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const { id: taskId } = await params
    const body = await request.json()
    
    console.log("[API] PUT /api/admin/tasks/[id]", { 
      admin: wallet.slice(0, 10) + "...",
      taskId,
      title: body.title 
    })

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if task exists
    const { data: existingTask, error: checkError } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("id", taskId)
      .single()

    if (checkError || !existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    // Validate fields if provided
    const {
      title,
      description,
      points,
      tokens,
      task_type,
      verification_method,
      status,
      link,
      icon,
      verification_hint,
      category,
      start_date,
      end_date
    } = body

    // Validate points if provided
    if (points !== undefined && (typeof points !== "number" || points < 0)) {
      return NextResponse.json(
        { success: false, error: "Points must be a non-negative number" },
        { status: 400 }
      )
    }

    // Validate tokens if provided
    if (tokens !== undefined && (typeof tokens !== "number" || tokens < 0)) {
      return NextResponse.json(
        { success: false, error: "Tokens must be a non-negative number" },
        { status: 400 }
      )
    }

    // Validate task_type if provided
    if (task_type) {
      const validTaskTypes = [
        "twitter_follow", 
        "twitter_engagement",
        "telegram_channel", 
        "telegram_chat",
        "discord"
      ]
      if (!validTaskTypes.includes(task_type)) {
        return NextResponse.json(
          { success: false, error: `Invalid task_type. Must be one of: ${validTaskTypes.join(", ")}` },
          { status: 400 }
        )
      }
    }

    // Build update object with only provided fields
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (points !== undefined) updateData.points = points
    if (task_type !== undefined) updateData.task_type = task_type
    if (link !== undefined) updateData.action_url = link
    if (status !== undefined) updateData.is_active = status === 'active'

    // Update task
    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .select()
      .single()

    if (updateError) {
      console.error("[API] Error updating task:", updateError)
      return NextResponse.json(
        { success: false, error: "Failed to update task" },
        { status: 500 }
      )
    }

    console.log("[API] Task updated successfully:", taskId)

    return NextResponse.json({
      success: true,
      task: {
        ...updatedTask,
        status: updatedTask.is_active ? 'active' : 'inactive',
        link: updatedTask.action_url,
        tokens: tokens || updatedTask.tokens || 0,
        verification_method: getVerificationMethod(updatedTask.task_type),
        icon: getTaskIcon(updatedTask.task_type),
        verification_hint: getVerificationHint(updatedTask.task_type),
        category: getTaskCategory(updatedTask.task_type)
      }
    })

  } catch (error) {
    console.error("[API] Error in PUT /api/admin/tasks/[id]:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/tasks/[id]
 * Archives a task (soft delete) (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet")

    if (!wallet || !isValidEvmAddress(wallet)) {
      return NextResponse.json({ success: false, error: "Valid wallet address required" }, { status: 400 })
    }

    if (!isAdmin(wallet)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const { id: taskId } = await params
    
    console.log("[API] DELETE /api/admin/tasks/[id]", { 
      admin: wallet.slice(0, 10) + "...",
      taskId
    })

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if task exists
    const { data: existingTask, error: checkError } = await supabase
      .from("tasks")
      .select("id, title, is_active")
      .eq("id", taskId)
      .single()

    if (checkError || !existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    if (!existingTask.is_active) {
      return NextResponse.json(
        { success: false, error: "Task is already inactive" },
        { status: 400 }
      )
    }

    // Check if task has completions
    const { data: completions, error: completionsError } = await supabase
      .from("tasks_completion")
      .select("id")
      .eq("task_id", taskId)
      .limit(1)

    if (completionsError) {
      console.error("[API] Error checking completions:", completionsError)
    }

    // Soft delete - set is_active to false
    const { error: deleteError } = await supabase
      .from("tasks")
      .update({ is_active: false })
      .eq("id", taskId)

    if (deleteError) {
      console.error("[API] Error archiving task:", deleteError)
      return NextResponse.json(
        { success: false, error: "Failed to archive task" },
        { status: 500 }
      )
    }

    console.log("[API] Task archived successfully:", taskId)

    return NextResponse.json({
      success: true,
      message: "Task archived successfully",
      task_id: taskId,
      had_completions: completions && completions.length > 0
    })

  } catch (error) {
    console.error("[API] Error in DELETE /api/admin/tasks/[id]:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/tasks/[id]
 * Permanently deletes a task (hard delete) (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet")

    if (!wallet || !isValidEvmAddress(wallet)) {
      return NextResponse.json({ success: false, error: "Valid wallet address required" }, { status: 400 })
    }

    if (!isAdmin(wallet)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const { id: taskId } = await params
    const body = await request.json()
    
    // Require confirmation
    if (body.action !== 'delete-permanent' || body.confirm !== true) {
      return NextResponse.json(
        { success: false, error: "Confirmation required for permanent deletion" },
        { status: 400 }
      )
    }
    
    console.log("[API] POST /api/admin/tasks/[id]/delete-permanent", { 
      admin: wallet.slice(0, 10) + "...",
      taskId
    })

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if task exists
    const { data: existingTask, error: checkError } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("id", taskId)
      .single()

    if (checkError || !existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      )
    }

    // Check completions count
    const { data: completions, error: completionsError } = await supabase
      .from("tasks_completion")
      .select("id")
      .eq("task_id", taskId)

    const completionCount = completions?.length || 0

    // Delete completions first
    if (completionCount > 0) {
      const { error: deleteCompletionsError } = await supabase
        .from("tasks_completion")
        .delete()
        .eq("task_id", taskId)

      if (deleteCompletionsError) {
        console.error("[API] Error deleting completions:", deleteCompletionsError)
        return NextResponse.json(
          { success: false, error: "Failed to delete task completions" },
          { status: 500 }
        )
      }
    }

    // Permanently delete task
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)

    if (deleteError) {
      console.error("[API] Error deleting task:", deleteError)
      return NextResponse.json(
        { success: false, error: "Failed to delete task" },
        { status: 500 }
      )
    }

    console.log("[API] Task permanently deleted:", taskId, `(${completionCount} completions removed)`)

    return NextResponse.json({
      success: true,
      message: "Task permanently deleted",
      task_id: taskId,
      completions_deleted: completionCount
    })

  } catch (error) {
    console.error("[API] Error in POST /api/admin/tasks/[id]:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper functions
function getVerificationMethod(taskType: string): string {
  const mapping: Record<string, string> = {
    'twitter_follow': 'tweet',
    'twitter_engagement': 'tweet',
    'telegram_channel': 'auto',
    'telegram_chat': 'auto',
    'discord': 'auto'
  }
  return mapping[taskType] || 'tweet'
}

function getTaskIcon(taskType: string): string {
  const mapping: Record<string, string> = {
    'twitter_follow': 'twitter',
    'twitter_engagement': 'message-circle',
    'telegram_channel': 'send',
    'telegram_chat': 'users',
    'discord': 'discord'
  }
  return mapping[taskType] || 'star'
}

function getVerificationHint(taskType: string): string {
  const mapping: Record<string, string> = {
    'twitter_follow': 'Tweet: "Following @KabbalahCode #KabbalahCode {wallet_code}"',
    'twitter_engagement': 'Like, Retweet, and Comment on the tweet. Paste your comment link to verify.',
    'telegram_channel': 'Connect Telegram in Profile tab',
    'telegram_chat': 'Connect Telegram in Profile tab',
    'discord': 'Connect Discord in Profile tab'
  }
  return mapping[taskType] || 'Complete the task and verify'
}

function getTaskCategory(taskType: string): string {
  const mapping: Record<string, string> = {
    'twitter_follow': 'social',
    'twitter_engagement': 'social',
    'telegram_channel': 'community',
    'telegram_chat': 'community',
    'discord': 'community'
  }
  return mapping[taskType] || 'social'
}
