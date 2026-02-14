import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { contractService } from '@/lib/web3/contracts'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemName, quantity, paymentMethod, ethValue } = body

    if (!itemName || !quantity || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Initialize contract service
    await contractService.initialize()

    // Get item ID from contract
    const itemId = await contractService.getItemIdByName(itemName)
    if (!itemId) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Get item info
    const itemInfo = await contractService.getItemInfo(itemId)
    
    let transactionHash = ''
    let cost = '0'
    
    try {
      // Execute purchase based on payment method
      switch (paymentMethod) {
        case 'points':
          // Check if user has enough points
          const userPoints = await contractService.getUserPoints(user.wallet_address)
          const pointsCost = Number(itemInfo.pointsCost) * quantity
          
          if (userPoints < pointsCost) {
            return NextResponse.json(
              { error: 'Insufficient points' },
              { status: 400 }
            )
          }
          
          const pointsTx = await contractService.purchaseWithPoints(itemId, quantity)
          transactionHash = pointsTx.hash
          cost = pointsCost.toString()
          break

        case 'tokens':
          const tokensTx = await contractService.purchaseWithTokens(itemId, quantity)
          transactionHash = tokensTx.hash
          cost = (Number(itemInfo.tokensCost) * quantity).toString()
          break

        case 'eth':
          if (!ethValue) {
            return NextResponse.json(
              { error: 'ETH value required' },
              { status: 400 }
            )
          }
          
          const ethTx = await contractService.purchaseWithETH(itemId, quantity, ethValue)
          transactionHash = ethTx.hash
          cost = ethValue
          break

        default:
          return NextResponse.json(
            { error: 'Invalid payment method' },
            { status: 400 }
          )
      }

      // Record purchase in database
      const { error: purchaseError } = await supabase
        .from('game_purchases')
        .insert({
          user_id: userId,
          item_name: itemName,
          item_id: itemId,
          quantity,
          cost_amount: cost,
          cost_type: paymentMethod,
          transaction_hash: transactionHash,
          status: 'pending'
        })

      if (purchaseError) {
        console.error('Error recording purchase:', purchaseError)
      }

      // Record blockchain transaction
      const { error: txError } = await supabase
        .from('blockchain_transactions')
        .insert({
          user_id: userId,
          wallet_address: user.wallet_address,
          contract_address: process.env.NEXT_PUBLIC_GAME_ECONOMICS_ADDRESS || '',
          transaction_hash: transactionHash,
          transaction_type: 'purchase_item',
          amount: cost,
          status: 'pending'
        })

      if (txError) {
        console.error('Error recording transaction:', txError)
      }

      // Process immediate effects (for points purchases)
      if (paymentMethod === 'points') {
        await processItemEffects(userId, itemName, quantity, supabase)
      }

      return NextResponse.json({
        success: true,
        data: {
          transactionHash,
          itemName,
          quantity,
          cost,
          paymentMethod,
          status: 'pending'
        }
      })

    } catch (contractError) {
      console.error('Contract interaction error:', contractError)
      return NextResponse.json(
        { error: 'Transaction failed' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error processing purchase:', error)
    return NextResponse.json(
      { error: 'Failed to process purchase' },
      { status: 500 }
    )
  }
}

async function processItemEffects(
  userId: string,
  itemName: string,
  quantity: number,
  supabase: any
) {
  try {
    switch (itemName) {
      case 'Extra Spin':
        // Add free spins to user
        await supabase
          .from('users')
          .update({
            free_spins: supabase.raw('free_spins + ?', [quantity])
          })
          .eq('id', userId)
        break

      case 'Point Multiplier':
        // Add multiplier effect (24 hours)
        const multiplierExpiry = new Date()
        multiplierExpiry.setHours(multiplierExpiry.getHours() + 24)
        
        await supabase
          .from('users')
          .update({
            active_multiplier: 2, // 2x multiplier
            multiplier_expires_at: multiplierExpiry.toISOString()
          })
          .eq('id', userId)
        break

      case 'Sacred NFT':
        // This would trigger NFT minting process
        // Could be handled by a separate service
        break

      default:
        console.log(`No special effects for item: ${itemName}`)
    }
  } catch (error) {
    console.error('Error processing item effects:', error)
  }
}