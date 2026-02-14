import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserByWallet } from "@/lib/db/users"
import { isValidEvmAddress } from "@/lib/anti-abuse/validators"
import { checkRateLimit } from "@/lib/anti-abuse/rate-limiter"

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet")

    if (!wallet) {
      return NextResponse.json({ success: false, error: "Wallet required" }, { status: 400 })
    }

    if (!isValidEvmAddress(wallet)) {
      return NextResponse.json({ success: false, error: "Invalid wallet address format" }, { status: 400 })
    }

    // ✅ Rate limiting
    const rateLimit = checkRateLimit(wallet, "API_GENERAL")
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          retryAfter: Math.ceil(rateLimit.resetIn / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetIn / 1000).toString(),
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        },
      )
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
      return NextResponse.json({ success: true, completedTasks: [] })
    }

    // ✅ Обработка ошибок
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks_completion")
      .select("task_type")
      .eq("user_id", user.id)

    if (tasksError) {
      console.error("[API] Error fetching tasks:", tasksError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    const completedTasks = tasks?.map((t) => t.task_type) || []

    return NextResponse.json({ success: true, completedTasks })
  } catch (error) {
    console.error("[API] Error in GET /api/user/tasks:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch tasks"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
