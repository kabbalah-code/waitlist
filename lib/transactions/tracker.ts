import { createAdminClient } from '@/lib/supabase/admin'

interface RequiredTransaction {
  userId: string
  type: 'mint' | 'reward' | 'burn'
  amount: string
  description: string
  relatedId?: string // task_id, ritual_id, etc.
  walletAddress: string
}

export class TransactionTracker {
  private supabase = createAdminClient()

  async ensureTransaction(transaction: RequiredTransaction): Promise<boolean> {
    try {
      // Check if transaction already exists
      const { data: existing } = await this.supabase
        .from('token_transactions')
        .select('id')
        .eq('user_id', transaction.userId)
        .eq('transaction_type', transaction.type)
        .eq('amount', transaction.amount)
        .eq('description', transaction.description)
        .maybeSingle()

      if (existing) {
        console.log('[TransactionTracker] Transaction already exists:', transaction.description)
        return true
      }

      // Create missing transaction
      const { error } = await this.supabase
        .from('token_transactions')
        .insert({
          user_id: transaction.userId,
          transaction_hash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
          transaction_type: transaction.type,
          amount: transaction.amount,
          to_address: transaction.walletAddress,
          status: 'confirmed',
          description: transaction.description,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('[TransactionTracker] Failed to create transaction:', error)
        return false
      }

      console.log('[TransactionTracker] ✅ Created missing transaction:', transaction.description)
      return true

    } catch (error) {
      console.error('[TransactionTracker] Error ensuring transaction:', error)
      return false
    }
  }

  async validateUserTransactions(userId: string): Promise<void> {
    try {
      console.log('[TransactionTracker] Validating transactions for user:', userId.slice(0, 8) + '...')

      // Get user data
      const { data: user } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (!user) return

      // Check completed tasks
      const { data: completedTasks } = await this.supabase
        .from('tasks_completion')
        .select('task_type, points_earned, completed_at')
        .eq('user_id', userId)

      // Check completed rituals
      const { data: completedRituals } = await this.supabase
        .from('daily_rituals')
        .select('points_earned, ritual_date')
        .eq('user_id', userId)

      // Ensure task reward transactions
      if (completedTasks) {
        for (const task of completedTasks) {
          const tokensEarned = Math.floor(task.points_earned / 100)
          if (tokensEarned > 0) {
            await this.ensureTransaction({
              userId,
              type: 'mint',
              amount: tokensEarned.toString(),
              description: `Task reward: ${task.task_type}`,
              walletAddress: user.wallet_address
            })
          }
        }
      }

      // Ensure ritual reward transactions
      if (completedRituals) {
        for (const ritual of completedRituals) {
          const tokensEarned = Math.floor(ritual.points_earned / 100)
          if (tokensEarned > 0) {
            await this.ensureTransaction({
              userId,
              type: 'mint',
              amount: tokensEarned.toString(),
              description: `Daily ritual reward`,
              walletAddress: user.wallet_address
            })
          }
        }
      }

    } catch (error) {
      console.error('[TransactionTracker] Error validating user transactions:', error)
    }
  }

  async validateAllTransactions(): Promise<void> {
    try {
      console.log('[TransactionTracker] Starting full transaction validation...')

      // Get all users with completed activities
      const { data: users } = await this.supabase
        .from('users')
        .select('id')

      if (!users) return

      for (const user of users) {
        await this.validateUserTransactions(user.id)
      }

      console.log('[TransactionTracker] ✅ Full validation complete')

    } catch (error) {
      console.error('[TransactionTracker] Error in full validation:', error)
    }
  }
}

export const transactionTracker = new TransactionTracker()