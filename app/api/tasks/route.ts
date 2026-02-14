import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/tasks
 * Returns active tasks for authenticated user with completion status
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from middleware headers
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

    console.log("[API] GET /api/tasks", { walletAddress: walletAddress.slice(0, 10) + "..." })

    const supabase = await createClient()

    // Get active tasks with completion status for current user
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        description,
        points,
        tokens,
        task_type,
        action_url,
        is_active,
        created_at
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    if (tasksError) {
      console.error("[API] Error fetching tasks:", tasksError)
      return NextResponse.json(
        { success: false, error: "Failed to fetch tasks" },
        { status: 500 }
      )
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        tasks: []
      })
    }

    // Filter tasks by date range (if start_date/end_date are set) - Skip for now
    const activeTasks = tasks || []

    // Get completion status for current user
    const taskIds = activeTasks.map(task => task.id)
    
    // Get completions - both with task_id and legacy without task_id
    const { data: completions, error: completionsError } = await supabase
      .from("tasks_completion")
      .select("task_id, task_type, points_earned")
      .eq("user_id", userId)

    console.log("[API] Completions check:", { 
      userId: userId.slice(0, 8) + "...", 
      completions: completions?.length || 0,
      taskIds: completions?.map(c => c.task_id).filter(Boolean) || [],
      taskTypes: completions?.map(c => c.task_type) || []
    })

    if (completionsError) {
      console.error("[API] Error fetching completions:", completionsError)
      // Return tasks without completion status if there's an error
      const tasksWithStatus = activeTasks.map(task => ({
        ...task,
        verification_method: getVerificationMethod(task.task_type),
        link: task.action_url,
        icon: getTaskIcon(task.task_type),
        verification_hint: getVerificationHint(task.task_type),
        category: getTaskCategory(task.task_type),
        completed: false // Default to not completed if we can't check
      }))

      return NextResponse.json({
        success: true,
        tasks: tasksWithStatus
      })
    }

    // Create a Set of completed task IDs for fast lookup
    const completedTaskIds = new Set(completions?.map(c => c.task_id).filter(Boolean) || [])

    // Add completion status to tasks
    const tasksWithStatus = activeTasks.map(task => ({
      ...task,
      // Map current task structure to expected format
      verification_method: getVerificationMethod(task.task_type),
      link: task.action_url,
      icon: getTaskIcon(task.task_type),
      verification_hint: getVerificationHint(task.task_type),
      category: getTaskCategory(task.task_type),
      // ✅ Check ONLY by task_id (no fallback to task_type)
      completed: completedTaskIds.has(task.id)
    }))

    return NextResponse.json({
      success: true,
      tasks: tasksWithStatus
    })

  } catch (error) {
    console.error("[API] Error in GET /api/tasks:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper functions to map existing task structure to new format
function getVerificationMethod(taskType: string): string {
  const mapping: Record<string, string> = {
    'twitter_follow': 'auto',
    'twitter_engagement': 'auto',
    'telegram_channel': 'auto',
    'telegram_chat': 'auto',
    'discord': 'auto'
  }
  return mapping[taskType] || 'auto'
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
    'twitter_follow': 'Click the link to follow, then click Complete to verify',
    'twitter_engagement': 'Like, Retweet, and Comment on the tweet. Paste your comment link to verify.',
    'telegram_channel': 'Connect Telegram in Profile tab',
    'telegram_chat': 'Connect Telegram in Profile tab',
    'discord': 'Connect Discord in Profile tab'
  }
  return mapping[taskType] || 'Complete the task and click Complete to verify'
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