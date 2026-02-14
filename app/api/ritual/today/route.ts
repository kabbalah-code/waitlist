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

    console.log("[API] GET /api/ritual/today", {
      userId: userId.slice(0, 10) + "...",
    })

    // Use service role key for server-side operations
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get today's date
    const today = new Date().toISOString().split("T")[0]

    // ✅ Получаем сегодняшний ритуал пользователя
    const { data: ritual, error: ritualError } = await supabase
      .from("daily_rituals")
      .select("*")
      .eq("user_id", userId)
      .eq("ritual_date", today)
      .maybeSingle()

    if (ritualError) {
      console.error("[API] Error fetching today's ritual:", ritualError)
      return NextResponse.json({ 
        success: false, 
        error: "Database error" 
      }, { status: 500 })
    }

    if (!ritual) {
      return NextResponse.json({ 
        success: false, 
        error: "No ritual found for today" 
      }, { status: 404 })
    }

    // ✅ Возвращаем данные ритуала
    return NextResponse.json({
      success: true,
      ritual: {
        id: ritual.id,
        prediction_text: ritual.prediction_text,
        prediction_code: `${userId.slice(0, 6)}-${today}`, // Generate code
        sephira_name: ritual.prediction_data?.sephira?.name || 'Keter',
        domain_name: ritual.prediction_data?.domain?.name || 'Wisdom',
        points_earned: ritual.points_earned,
        tokens_minted: ritual.tokens_minted || 0,
        transaction_hash: ritual.transaction_hash || '',
        tokens_awarded: ritual.tokens_minted || 0, // Alias for compatibility
        ritual_date: ritual.ritual_date,
        created_at: ritual.created_at,
        alternative_reward: ritual.alternative_reward,
        max_supply_reached: ritual.max_supply_reached || false
      }
    })

  } catch (error) {
    console.error("[API] Error in GET /api/ritual/today:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to get today's ritual"
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}