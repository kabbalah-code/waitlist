import { type NextRequest, NextResponse } from "next/server"
import { getUserByWallet } from "@/lib/db/users"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"
import { getAllAchievementsWithStatus } from "@/lib/achievements/checker"

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet")

    if (!wallet) {
      return NextResponse.json({ success: false, error: "Wallet address required" }, { status: 400 })
    }

    if (!isValidEvmAddress(wallet)) {
      return NextResponse.json({ success: false, error: "Invalid wallet address format" }, { status: 400 })
    }

    const user = await getUserByWallet(wallet)
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const achievements = await getAllAchievementsWithStatus(user.id)

    return NextResponse.json({
      success: true,
      data: achievements,
    })
  } catch (error) {
    console.error("[API] Error in GET /api/achievements/list:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch achievements"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}


