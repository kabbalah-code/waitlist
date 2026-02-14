import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserByWallet } from "@/lib/db/users"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet")

    if (!wallet) {
      return NextResponse.json({ success: false, error: "Wallet address required" }, { status: 400 })
    }

    if (!isValidEvmAddress(wallet)) {
      return NextResponse.json({ success: false, error: "Invalid wallet address format" }, { status: 400 })
    }

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
        { status: 500 },
      )
    }

    const user = await getUserByWallet(wallet)
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Get all sephirot
    const { data: sephirot, error: sephirotError } = await supabase
      .from("sephirot")
      .select("*")
      .order("id", { ascending: true })

    if (sephirotError) {
      console.error("[API] Error fetching sephirot:", sephirotError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    // Get user's unlocked sephirot
    const { data: unlocked, error: unlockedError } = await supabase
      .from("user_sephirot")
      .select("sephira_id")
      .eq("user_id", user.id)

    if (unlockedError) {
      console.error("[API] Error fetching unlocked sephirot:", unlockedError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    const unlockedIds = new Set(unlocked?.map((u) => u.sephira_id) || [])

    // Combine data
    const sephirotWithStatus = sephirot?.map((sephira) => ({
      id: sephira.id,
      name: sephira.name,
      nameHebrew: sephira.name_hebrew,
      description: sephira.description,
      requiredLevel: sephira.required_level,
      unlockCost: sephira.unlock_cost,
      unlockReward: sephira.unlock_reward,
      bonusDescription: sephira.bonus_description,
      bonusValue: sephira.bonus_value,
      positionX: sephira.position_x,
      positionY: sephira.position_y,
      isUnlocked: unlockedIds.has(sephira.id),
      canUnlock:
        user.level >= sephira.required_level &&
        user.available_points >= sephira.unlock_cost &&
        !unlockedIds.has(sephira.id),
    }))

    return NextResponse.json({
      success: true,
      data: {
        sephirot: sephirotWithStatus,
        userLevel: user.level,
        availablePoints: user.available_points,
      },
    })
  } catch (error) {
    console.error("[API] Error in GET /api/sephirot/list:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch sephirot"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}


