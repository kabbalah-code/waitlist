import { type NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    // ✅ КРИТИЧНО: Получаем userId из headers (установлен middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please authenticate first." },
        { status: 401 }
      )
    }

    const date = request.nextUrl.searchParams.get("date")
    if (!date) {
      return NextResponse.json(
        { success: false, error: "Date parameter required" },
        { status: 400 }
      )
    }

    console.log("[API] GET /api/wheel/spins-count", {
      userId: userId.slice(0, 10) + "...",
      date,
    })

    // Use service role key for server-side operations
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Count spins for the specified date
    const { count, error: spinsError } = await supabase
      .from("wheel_spins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", `${date}T00:00:00.000Z`)
      .lt("created_at", `${date}T23:59:59.999Z`)

    if (spinsError) {
      console.error("[API] Error counting spins:", spinsError)
      return NextResponse.json({ 
        success: false, 
        error: "Database error" 
      }, { status: 500 })
    }

    const spinCount = count || 0

    return NextResponse.json({
      success: true,
      count: spinCount,
      date
    })

  } catch (error) {
    console.error("[API] Error in GET /api/wheel/spins-count:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to count spins"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}