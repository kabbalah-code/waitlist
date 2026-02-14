import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"
import { isAdmin } from "@/lib/admin/auth"

/**
 * GET /api/admin/users
 * Returns all users with statistics for admin users
 */
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet")

    console.log("[API] /api/admin/users - wallet from query:", wallet)

    if (!wallet || !isValidEvmAddress(wallet)) {
      console.log("[API] /api/admin/users - invalid wallet")
      return NextResponse.json({ success: false, error: "Valid wallet address required" }, { status: 400 })
    }

    const adminCheck = isAdmin(wallet)
    console.log("[API] /api/admin/users - isAdmin check:", adminCheck)

    if (!adminCheck) {
      console.log("[API] /api/admin/users - unauthorized")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    console.log("[API] GET /api/admin/users - authorized, fetching data...")

    const supabase = createAdminClient()

    // Get all users with their statistics
    console.log("[API] Step 1: Fetching users...")
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select(`
        id,
        wallet_address,
        twitter_username,
        telegram_username,
        total_points,
        current_streak,
        last_ritual_date,
        referral_code,
        created_at
      `)
      .order("created_at", { ascending: false })

    if (usersError) {
      console.error("[API] Error fetching users:", usersError)
      return NextResponse.json(
        { success: false, error: "Failed to fetch users: " + usersError.message },
        { status: 500 }
      )
    }

    console.log("[API] Users fetched:", users?.length || 0)

    if (!users || users.length === 0) {
      console.log("[API] No users found, returning empty array")
      return NextResponse.json({
        success: true,
        users: []
      })
    }

    // Get task completion counts for each user
    const userIds = users.map(user => user.id)
    
    console.log("[API] Step 2: Fetching completions for", userIds.length, "users...")
    const { data: completions, error: completionsError } = await supabase
      .from("tasks_completion")
      .select("user_id, points_earned")
      .in("user_id", userIds)

    if (completionsError) {
      console.error("[API] Error fetching completions:", completionsError)
    } else {
      console.log("[API] Completions fetched:", completions?.length || 0)
    }

    // Get wheel spins count for each user
    console.log("[API] Step 3: Fetching wheel spins...")
    const { data: spins, error: spinsError } = await supabase
      .from("wheel_spins")
      .select("user_id")
      .in("user_id", userIds)

    if (spinsError) {
      console.error("[API] Error fetching spins:", spinsError)
    } else {
      console.log("[API] Spins fetched:", spins?.length || 0)
    }

    // Get referral counts for each user
    console.log("[API] Step 4: Fetching referrals...")
    const { data: referrals, error: referralsError } = await supabase
      .from("referrals")
      .select("referrer_id")
      .in("referrer_id", userIds)

    if (referralsError) {
      console.error("[API] Error fetching referrals:", referralsError)
    } else {
      console.log("[API] Referrals fetched:", referrals?.length || 0)
    }

    // Calculate statistics for each user
    console.log("[API] Step 5: Calculating statistics...")
    const completionsMap = new Map()
    completions?.forEach(completion => {
      const userId = completion.user_id
      if (!completionsMap.has(userId)) {
        completionsMap.set(userId, {
          task_count: 0,
          total_earned: 0
        })
      }
      const stats = completionsMap.get(userId)
      stats.task_count++
      stats.total_earned += completion.points_earned || 0
    })

    const spinsMap = new Map()
    spins?.forEach(spin => {
      spinsMap.set(spin.user_id, (spinsMap.get(spin.user_id) || 0) + 1)
    })

    const referralsMap = new Map()
    referrals?.forEach(referral => {
      referralsMap.set(referral.referrer_id, (referralsMap.get(referral.referrer_id) || 0) + 1)
    })

    // Add statistics to users
    console.log("[API] Step 6: Building final user list...")
    const usersWithStats = users.map(user => ({
      ...user,
      tasks_completed: completionsMap.get(user.id)?.task_count || 0,
      points_from_tasks: completionsMap.get(user.id)?.total_earned || 0,
      wheel_spins: spinsMap.get(user.id) || 0,
      referrals_count: referralsMap.get(user.id) || 0,
      ritual_streak: user.current_streak || 0, // Map current_streak to ritual_streak for frontend
      is_active: user.last_ritual_date && 
        new Date(user.last_ritual_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }))

    console.log("[API] Success! Returning", usersWithStats.length, "users")
    return NextResponse.json({
      success: true,
      users: usersWithStats
    })

  } catch (error) {
    console.error("[API] FATAL ERROR in GET /api/admin/users:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch users: " + (error instanceof Error ? error.message : String(error))
    }, { status: 500 })
  }
}
