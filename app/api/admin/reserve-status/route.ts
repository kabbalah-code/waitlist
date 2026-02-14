import { NextRequest, NextResponse } from 'next/server'
import { getReserveMonitor } from '@/lib/monitoring/reserve-monitor'

/**
 * GET /api/admin/reserve-status
 * Получить статус резервов KCODE
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Добавить проверку админа
    // const isAdmin = await checkAdminAccess(request)
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const monitor = getReserveMonitor()
    const report = await monitor.getMonitoringReport()

    return NextResponse.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('[ReserveStatus] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get reserve status'
      },
      { status: 500 }
    )
  }
}
