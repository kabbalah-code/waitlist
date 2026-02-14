import { type NextRequest, NextResponse } from "next/server"
import { getUserByWallet } from "@/lib/db/users"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"
import { getReferralStats } from "@/lib/referrals/system"

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

    const stats = await getReferralStats(user.id)

    return NextResponse.json({
      success: true,
      data: {
        referralCode: user.referral_code,
        level1Count: stats.level1Count,
        level2Count: stats.level2Count,
        level3Count: stats.level3Count,
        totalEarned: stats.totalEarned,
        referralLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://kabbalahcode.app"}?ref=${user.referral_code}`,
      },
    })
  } catch (error) {
    console.error("[API] Error in GET /api/referrals/stats:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch referral stats"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}


