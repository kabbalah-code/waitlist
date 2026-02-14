import { NextRequest, NextResponse } from 'next/server'
import { transactionTracker } from '@/lib/transactions/tracker'

export async function POST(request: NextRequest) {
  try {
    // Admin only endpoint
    const adminWallet = '0x0E80D31beA7EdCF68C6173731bd515A9fb3626D4'
    const walletAddress = request.headers.get('x-wallet-address')
    
    if (walletAddress?.toLowerCase() !== adminWallet.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await request.json()

    if (userId) {
      // Validate specific user
      await transactionTracker.validateUserTransactions(userId)
      return NextResponse.json({ 
        success: true, 
        message: `Validated transactions for user ${userId.slice(0, 8)}...` 
      })
    } else {
      // Validate all users
      await transactionTracker.validateAllTransactions()
      return NextResponse.json({ 
        success: true, 
        message: 'Validated all user transactions' 
      })
    }

  } catch (error) {
    console.error('[Admin] Transaction validation error:', error)
    return NextResponse.json({ 
      error: 'Validation failed' 
    }, { status: 500 })
  }
}