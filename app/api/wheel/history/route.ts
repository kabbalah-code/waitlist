import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/wheel/history
 * Получение истории спинов пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID not found' },
        { status: 401 }
      )
    }

    console.log('[API] GET /api/wheel/history for user:', userId.slice(0, 8) + '...')

    // Используем service role client для обхода RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Получаем историю спинов пользователя
    const { data: spins, error } = await supabase
      .from('wheel_spins')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[API] Error fetching wheel spins:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch spin history' },
        { status: 500 }
      )
    }

    console.log('[API] ✅ Found', spins?.length || 0, 'spins')

    return NextResponse.json({
      success: true,
      spins: spins || [],
      count: spins?.length || 0
    })

  } catch (error) {
    console.error('[API] Unexpected error in /api/wheel/history:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
