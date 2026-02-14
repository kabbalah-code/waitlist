import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface TelegramUser {
  id: number
  username?: string
  firstName: string
  lastName?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify internal API call
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.INTERNAL_API_SECRET}`
    
    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { walletCode, telegramUser }: { walletCode: string, telegramUser: TelegramUser } = await request.json()

    if (!walletCode || !telegramUser) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find user by wallet code (first 6 chars of wallet address)
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('id, wallet_address, telegram_username, telegram_user_id, total_points, available_points')
      .ilike('wallet_address', `%${walletCode}%`)

    if (searchError) {
      console.error('[API] Database search error:', searchError)
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      )
    }

    // Find exact match (wallet address contains the code)
    const user = users?.find(u => 
      u.wallet_address.toLowerCase().slice(2, 8) === walletCode.toLowerCase()
    )

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Wallet code not found. Make sure you copied it correctly from dashboard.' },
        { status: 404 }
      )
    }

    // Check if Telegram already linked
    if (user.telegram_username || user.telegram_user_id) {
      return NextResponse.json(
        { success: false, error: 'Telegram account already linked to this wallet' },
        { status: 400 }
      )
    }

    // Check if this Telegram account is linked to another wallet
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('telegram_user_id', telegramUser.id)
      .maybeSingle()

    if (checkError) {
      console.error('[API] Error checking existing Telegram user:', checkError)
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'This Telegram account is already linked to another wallet' },
        { status: 400 }
      )
    }

    // Link Telegram account
    const { error: updateError } = await supabase
      .from('users')
      .update({
        telegram_username: telegramUser.username || null,
        telegram_user_id: telegramUser.id,
        telegram_first_name: telegramUser.firstName,
        telegram_last_name: telegramUser.lastName || null,
        telegram_verified_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[API] Error updating user:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to link Telegram account' },
        { status: 500 }
      )
    }

    // Award bonus points
    const bonusPoints = 75
    const { error: pointsError } = await supabase
      .from('users')
      .update({
        total_points: user.total_points + bonusPoints,
        available_points: user.available_points + bonusPoints,
      })
      .eq('id', user.id)

    if (pointsError) {
      console.error('[API] Error updating points:', pointsError)
      // Don't fail the request, verification is already saved
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('points_transactions')
      .insert({
        user_id: user.id,
        amount: bonusPoints,
        type: 'telegram_verification',
        description: 'Telegram account verified',
      })

    if (transactionError) {
      console.error('[API] Error recording transaction:', transactionError)
    }

    console.log(`[API] Telegram verified: ${telegramUser.username || telegramUser.firstName} -> ${user.wallet_address}`)

    return NextResponse.json({
      success: true,
      points: bonusPoints,
      username: telegramUser.username || telegramUser.firstName,
    })

  } catch (error) {
    console.error('[API] Error in POST /api/telegram/verify:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}