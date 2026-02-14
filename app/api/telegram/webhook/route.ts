import { NextRequest, NextResponse } from 'next/server'
import { processTelegramUpdate, type TelegramUpdate } from '@/lib/telegram/bot'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (optional but recommended)
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (webhookSecret) {
      const providedSecret = request.headers.get('x-telegram-bot-api-secret-token')
      if (providedSecret !== webhookSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const update: TelegramUpdate = await request.json()
    
    // Process the update asynchronously
    await processTelegramUpdate(update)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}