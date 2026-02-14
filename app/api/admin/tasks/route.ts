import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"
import { isAdmin } from "@/lib/admin/auth"

/**
 * GET /api/admin/tasks
 * Returns all tasks with statistics for admin users
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet")

    if (!wallet || !isValidEvmAddress(wallet)) {
      return NextResponse.json({ success: false, error: "Valid wallet address required" }, { status: 400 })
    }

    if (!isAdmin(wallet)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    console.log("[API] GET /api/admin/tasks", { admin: wallet.slice(0, 10) + "..." })

    const supabase = createAdminClient()

      // Get all tasks with completion statistics
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          points,
          task_type,
          action_url,
          is_active,
          created_at
        `)
        .order("created_at", { ascending: false })

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

      // Get completion statistics for each task
      const taskIds = tasks.map(task => task.id)
      
      const { data: completionStats, error: statsError } = await supabase
        .from("tasks_completion")
        .select("task_id, points_earned")
        .in("task_id", taskIds)

      if (statsError) {
        console.error("[API] Error fetching completion stats:", statsError)
        // Continue without stats rather than failing
      }

      // Calculate statistics for each task
      const statsMap = new Map()
      completionStats?.forEach(completion => {
        const taskId = completion.task_id
        if (!statsMap.has(taskId)) {
          statsMap.set(taskId, {
            completion_count: 0,
            total_points_distributed: 0
          })
        }
        const stats = statsMap.get(taskId)
        stats.completion_count++
        stats.total_points_distributed += completion.points_earned || 0
      })

      // Add statistics to tasks
      const tasksWithStats = tasks.map(task => ({
        ...task,
        // Map to expected format
        status: task.is_active ? 'active' : 'inactive',
        link: task.action_url,
        tokens: task.tokens || 0, // Return 0 if column doesn't exist
        verification_method: getVerificationMethod(task.task_type),
        icon: getTaskIcon(task.task_type),
        verification_hint: getVerificationHint(task.task_type),
        category: getTaskCategory(task.task_type),
        completion_count: statsMap.get(task.id)?.completion_count || 0,
        total_points_distributed: statsMap.get(task.id)?.total_points_distributed || 0
      }))

      return NextResponse.json({
        success: true,
        tasks: tasksWithStats
      })

  } catch (error) {
    console.error("[API] Error in GET /api/admin/tasks:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper functions to map existing task structure to new format
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

/**
 * POST /api/admin/tasks
 * Creates a new task (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet")

    if (!wallet || !isValidEvmAddress(wallet)) {
      return NextResponse.json({ success: false, error: "Valid wallet address required" }, { status: 400 })
    }

    if (!isAdmin(wallet)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    
    console.log("[API] POST /api/admin/tasks", { 
      admin: wallet.slice(0, 10) + "...",
      title: body.title 
    })

      // Validate required fields
      const {
        title,
        description,
        points,
        tokens,
        task_type,
        verification_method,
        link,
        icon,
        verification_hint,
        category,
        start_date,
        end_date
      } = body

      if (!title || !task_type) {
        return NextResponse.json(
          { success: false, error: "Missing required fields: title, task_type" },
          { status: 400 }
        )
      }

      // Validate points
      if (points !== undefined && (typeof points !== "number" || points < 0)) {
        return NextResponse.json(
          { success: false, error: "Points must be a non-negative number" },
          { status: 400 }
        )
      }

      // Validate tokens
      if (tokens !== undefined && (typeof tokens !== "number" || tokens < 0)) {
        return NextResponse.json(
          { success: false, error: "Tokens must be a non-negative number" },
          { status: 400 }
        )
      }

      // Validate task_type
      const validTaskTypes = [
        // Twitter tasks (only these two are valid)
        "twitter_follow", 
        "twitter_engagement",
        // Social tasks
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

      console.log("[API] Creating task with admin client...")
      console.log("[API] Environment check:", {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        urlStart: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + "...",
        serviceKeyStart: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + "..."
      })
      
      const supabase = createAdminClient()

      // Calculate points from tokens if provided (1 KCODE = 100 points)
      const calculatedPoints = tokens ? Math.round(tokens * 100) : (points || 0)

      // Create task with existing schema - using admin client to bypass RLS
      const taskData: any = {
        title,
        description: description || null,
        points: calculatedPoints,
        task_type,
        action_url: link || null,
        is_active: true
      }

      // Try to add tokens field if it exists in the database
      if (tokens !== undefined) {
        taskData.tokens = tokens
      }

      console.log("[API] Task data:", taskData)

      const { data: task, error: createError } = await supabase
        .from("tasks")
        .insert(taskData)
        .select()
        .single()

      if (createError) {
        console.error("[API] Error creating task:", createError)
        
        // If tokens column doesn't exist, retry without it
        if (createError.message?.includes('tokens') || createError.code === '42703') {
          console.log("[API] Retrying without tokens column...")
          delete taskData.tokens
          
          const { data: retryTask, error: retryError } = await supabase
            .from("tasks")
            .insert(taskData)
            .select()
            .single()
          
          if (retryError) {
            console.error("[API] Retry error:", retryError)
            return NextResponse.json(
              { success: false, error: "Failed to create task" },
              { status: 500 }
            )
          }
          
          // Use retry result
          const finalTask = retryTask
          console.log("[API] Task created successfully (without tokens column):", finalTask.id)

          return NextResponse.json({
            success: true,
            task: {
              ...finalTask,
              // Map to expected format
              status: finalTask.is_active ? 'active' : 'inactive',
              link: finalTask.action_url,
              tokens: tokens || 0, // Return the requested tokens value even if not stored
              verification_method: getVerificationMethod(finalTask.task_type),
              icon: getTaskIcon(finalTask.task_type),
              verification_hint: getVerificationHint(finalTask.task_type),
              category: getTaskCategory(finalTask.task_type),
              completion_count: 0,
              total_points_distributed: 0
            }
          })
        }
        
        return NextResponse.json(
          { success: false, error: "Failed to create task" },
          { status: 500 }
        )
      }

      console.log("[API] Task created successfully:", task.id)

      return NextResponse.json({
        success: true,
        task: {
          ...task,
          // Map to expected format
          status: task.is_active ? 'active' : 'inactive',
          link: task.action_url,
          tokens: tokens || 0, // Return the requested tokens value even if not stored
          verification_method: getVerificationMethod(task.task_type),
          icon: getTaskIcon(task.task_type),
          verification_hint: getVerificationHint(task.task_type),
          category: getTaskCategory(task.task_type),
          completion_count: 0,
          total_points_distributed: 0
        }
      })

  } catch (error) {
    console.error("[API] Error in POST /api/admin/tasks:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}