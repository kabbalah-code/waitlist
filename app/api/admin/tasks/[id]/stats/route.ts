import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withAdminAuth } from "@/lib/middleware/admin"

/**
 * GET /api/admin/tasks/[id]/stats
 * Returns detailed statistics for a specific task (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async (adminUser) => {
    try {
      const { id: taskId } = await params
      const { searchParams } = new URL(request.url)
      const startDate = searchParams.get("start_date")
      const endDate = searchParams.get("end_date")
      
      console.log("[API] GET /api/admin/tasks/[id]/stats", { 
        admin: adminUser.wallet_address.slice(0, 10) + "...",
        taskId,
        dateRange: startDate && endDate ? `${startDate} to ${endDate}` : "all time"
      })

      if (!taskId) {
        return NextResponse.json(
          { success: false, error: "Task ID is required" },
          { status: 400 }
        )
      }

      const supabase = createAdminClient()

      // Check if task exists
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("id, title, points, created_at")
        .eq("id", taskId)
        .single()

      if (taskError || !task) {
        return NextResponse.json(
          { success: false, error: "Task not found" },
          { status: 404 }
        )
      }

      // Build query for completions with optional date filtering
      let completionsQuery = supabase
        .from("tasks_completion")
        .select("id, points_earned, created_at")
        .eq("task_id", taskId)

      if (startDate) {
        completionsQuery = completionsQuery.gte("created_at", startDate)
      }
      if (endDate) {
        completionsQuery = completionsQuery.lte("created_at", endDate)
      }

      const { data: completions, error: completionsError } = await completionsQuery

      if (completionsError) {
        console.error("[API] Error fetching completions:", completionsError)
        return NextResponse.json(
          { success: false, error: "Failed to fetch completion statistics" },
          { status: 500 }
        )
      }

      // Calculate basic statistics
      const totalCompletions = completions?.length || 0
      const totalPointsDistributed = completions?.reduce((sum, c) => sum + (c.points_earned || 0), 0) || 0

      // Calculate completion timeline (daily completions)
      const timelineMap = new Map<string, number>()
      completions?.forEach(completion => {
        const date = new Date(completion.created_at).toISOString().split('T')[0]
        timelineMap.set(date, (timelineMap.get(date) || 0) + 1)
      })

      const timeline = Array.from(timelineMap.entries())
        .map(([date, count]) => ({ date, completions: count }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Calculate completion rate (if we have total user count)
      const { count: totalUsers, error: usersError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })

      if (usersError) {
        console.error("[API] Error fetching user count:", usersError)
      }

      const completionRate = totalUsers ? (totalCompletions / totalUsers) * 100 : null

      // Get recent completions for activity feed
      const { data: recentCompletions, error: recentError } = await supabase
        .from("tasks_completion")
        .select(`
          id,
          points_earned,
          created_at,
          users!inner(wallet_address)
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (recentError) {
        console.error("[API] Error fetching recent completions:", recentError)
      }

      // Format recent completions for privacy (show only partial wallet addresses)
      const recentActivity = recentCompletions?.map(completion => ({
        id: completion.id,
        points_earned: completion.points_earned,
        created_at: completion.created_at,
        wallet_address: completion.users.wallet_address.slice(0, 6) + "..." + completion.users.wallet_address.slice(-4)
      })) || []

      const stats = {
        task: {
          id: task.id,
          title: task.title,
          points: task.points,
          created_at: task.created_at
        },
        statistics: {
          total_completions: totalCompletions,
          total_points_distributed: totalPointsDistributed,
          completion_rate: completionRate,
          average_points_per_completion: totalCompletions > 0 ? totalPointsDistributed / totalCompletions : 0
        },
        timeline,
        recent_activity: recentActivity,
        date_range: {
          start_date: startDate,
          end_date: endDate,
          filtered: !!(startDate || endDate)
        }
      }

      return NextResponse.json({
        success: true,
        stats
      })

    } catch (error) {
      console.error("[API] Error in GET /api/admin/tasks/[id]/stats:", error)
      return NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500 }
      )
    }
  })
}