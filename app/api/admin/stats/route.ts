import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"
import { isAdmin } from "@/lib/admin/auth"

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet")

    console.log("[API] /api/admin/stats - wallet from query:", wallet)

    if (!wallet || !isValidEvmAddress(wallet)) {
      console.log("[API] /api/admin/stats - invalid wallet")
      return NextResponse.json({ success: false, error: "Valid wallet address required" }, { status: 400 })
    }

    const adminCheck = isAdmin(wallet)
    console.log("[API] /api/admin/stats - isAdmin check:", adminCheck, "for wallet:", wallet)
    console.log("[API] /api/admin/stats - ADMIN_WALLET_ADDRESSES env:", process.env.ADMIN_WALLET_ADDRESSES)

    if (!adminCheck) {
      console.log("[API] /api/admin/stats - unauthorized")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const supabase = await createClient()

    // Get statistics
    const [
      usersCount,
      totalPoints,
      totalRituals,
      totalSpins,
      totalReferrals,
      activeUsers,
    ] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("users").select("total_points"),
      supabase.from("daily_rituals").select("id", { count: "exact", head: true }),
      supabase.from("wheel_spins").select("id", { count: "exact", head: true }),
      supabase.from("referrals").select("id", { count: "exact", head: true }),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte("last_ritual_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
    ])

    const totalPointsSum =
      totalPoints.data?.reduce((sum, user) => sum + (user.total_points || 0), 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: usersCount.count || 0,
          active: activeUsers.count || 0,
        },
        points: {
          total: totalPointsSum,
        },
        activity: {
          rituals: totalRituals.count || 0,
          spins: totalSpins.count || 0,
          referrals: totalReferrals.count || 0,
        },
      },
    })
  } catch (error) {
    console.error("[API] Error in GET /api/admin/stats:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 })
  }
}


