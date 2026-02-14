import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ethers } from 'ethers'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    
    // Get user data from our database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('wallet_address, total_points, available_points')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get actual KCODE token balance from blockchain
    let tokenBalance = "0"
    let gamePoints = user.total_points
    let pendingRewards = "0"

    try {
      // Try to get blockchain balance
      const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL)
      const tokenAddress = process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS
      
      if (tokenAddress && provider) {
        // ERC20 balanceOf ABI
        const abi = ["function balanceOf(address) view returns (uint256)"]
        const contract = new ethers.Contract(tokenAddress, abi, provider)
        
        const balance = await contract.balanceOf(user.wallet_address)
        tokenBalance = ethers.formatEther(balance)
        
        console.log(`[Balance API] Blockchain KCODE balance for ${user.wallet_address}: ${tokenBalance}`)
      }
    } catch (error) {
      console.error('[Balance API] Error fetching blockchain balance:', error)
      // Continue with 0 balance if blockchain call fails
    }

    // Get token transactions for this user
    const { data: transactions, error: txError } = await supabase
      .from('points_transactions')
      .select('amount, type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    const recentTransactions = transactions || []

    return NextResponse.json({
      success: true,
      data: {
        // Blockchain token balance (actual KCODE tokens)
        tokenBalance: tokenBalance,
        
        // Game points (separate from tokens)
        gamePoints: gamePoints,
        
        // Pending rewards (for staking, etc.)
        pendingRewards: pendingRewards,
        
        // Wallet info
        walletAddress: user.wallet_address,
        
        // Recent activity
        recentTransactions: recentTransactions.map(tx => ({
          amount: tx.amount,
          type: tx.type,
          date: tx.created_at
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    )
  }
}