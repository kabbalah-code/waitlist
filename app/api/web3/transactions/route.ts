import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/web3/transactions
 * Получение транзакций пользователя
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

    console.log('[API] GET /api/web3/transactions for user:', userId.slice(0, 8) + '...')

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

    // Получаем blockchain транзакции пользователя
    console.log('[API] Querying blockchain_transactions with user_id:', userId)
    
    const { data: transactions, error } = await supabase
      .from('blockchain_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    console.log('[API] Query result:', { 
      error: error?.message, 
      transactionsCount: transactions?.length || 0,
      firstThree: transactions?.slice(0, 3).map(tx => ({
        description: tx.description,
        type: tx.transaction_type,
        amount: tx.amount,
        hash: tx.transaction_hash?.slice(0, 20) + '...'
      }))
    })

    if (error) {
      console.error('[API] Error fetching transactions:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    console.log('[API] ✅ Found', transactions?.length || 0, 'transactions')

    // Преобразуем данные в формат, ожидаемый компонентом
    const formattedTransactions = transactions?.map(tx => ({
      id: tx.id,
      user_id: tx.user_id,
      transaction_hash: tx.transaction_hash,
      transaction_type: tx.transaction_type,
      status: tx.status,
      created_at: tx.created_at,
      description: tx.description || getTransactionDescription(tx.transaction_type, tx.amount),
      gas_used: tx.gas_used,
      block_number: tx.block_number,
      amount: tx.amount,
      wallet_address: tx.wallet_address,
      contract_address: tx.contract_address
    })) || []

    console.log('[API] Formatted transactions:', formattedTransactions.length, 'items')

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      count: formattedTransactions.length
    })

  } catch (error) {
    console.error('[API] Unexpected error in /api/web3/transactions:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getTransactionDescription(type: string, amount?: string): string {
  const descriptions: Record<string, string> = {
    'mint': `Minted ${amount || '0'} KCODE tokens`,
    'reward': `Received ${amount || '0'} KCODE reward`,
    'transfer': 'Token Transfer',
    'burn': 'Tokens Burned',
    'stake': 'Tokens Staked',
    'unstake': 'Tokens Unstaked'
  }
  return descriptions[type] || 'Blockchain Transaction'
}