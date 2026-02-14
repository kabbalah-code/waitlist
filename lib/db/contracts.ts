import { createClient } from '@/lib/supabase/server'

// Contract addresses and deployment info
export interface ContractDeployment {
  id: string
  network: string
  contract_name: string
  contract_address: string
  deployment_block: number
  deployment_tx: string
  abi: any
  is_active: boolean
  created_at: string
  updated_at: string
}

// User blockchain interactions
export interface BlockchainTransaction {
  id: string
  user_id: string
  wallet_address: string
  contract_address: string
  transaction_hash: string
  transaction_type: string // 'mint_nft', 'stake_tokens', 'purchase_item', etc.
  amount?: string
  token_id?: number
  status: 'pending' | 'confirmed' | 'failed'
  block_number?: number
  gas_used?: string
  gas_price?: string
  created_at: string
  updated_at: string
}

// User NFT ownership
export interface UserNFT {
  id: string
  user_id: string
  wallet_address: string
  contract_address: string
  token_id: number
  nft_type: number
  rarity: number
  level: number
  power: number
  is_soulbound: boolean
  mystical_properties: string
  metadata_uri: string
  minted_at: string
  created_at: string
  updated_at: string
}

// User token balances
export interface UserTokenBalance {
  id: string
  user_id: string
  wallet_address: string
  contract_address: string
  token_symbol: string
  balance: string
  staked_amount: string
  pending_rewards: string
  last_updated: string
  created_at: string
  updated_at: string
}

/**
 * Store contract deployment information
 */
export async function storeContractDeployment(deployment: Omit<ContractDeployment, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('contract_deployments')
    .insert(deployment)
    .select()
    .single()
  
  if (error) {
    console.error('Error storing contract deployment:', error)
    throw error
  }
  
  return data
}

/**
 * Get active contract addresses for a network
 */
export async function getActiveContracts(network: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('contract_deployments')
    .select('*')
    .eq('network', network)
    .eq('is_active', true)
  
  if (error) {
    console.error('Error fetching contracts:', error)
    throw error
  }
  
  return data
}

/**
 * Record blockchain transaction
 */
export async function recordTransaction(transaction: Omit<BlockchainTransaction, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('blockchain_transactions')
    .insert(transaction)
    .select()
    .single()
  
  if (error) {
    console.error('Error recording transaction:', error)
    throw error
  }
  
  return data
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  transactionHash: string, 
  status: 'confirmed' | 'failed',
  blockNumber?: number,
  gasUsed?: string
) {
  const supabase = await createClient()
  
  const updateData: any = { 
    status,
    updated_at: new Date().toISOString()
  }
  
  if (blockNumber) updateData.block_number = blockNumber
  if (gasUsed) updateData.gas_used = gasUsed
  
  const { data, error } = await supabase
    .from('blockchain_transactions')
    .update(updateData)
    .eq('transaction_hash', transactionHash)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating transaction status:', error)
    throw error
  }
  
  return data
}

/**
 * Store user NFT
 */
export async function storeUserNFT(nft: Omit<UserNFT, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()
  
  // Check if NFT already exists
  const { data: existing } = await supabase
    .from('user_nfts')
    .select('id')
    .eq('contract_address', nft.contract_address)
    .eq('token_id', nft.token_id)
    .single()
  
  if (existing) {
    // Update existing NFT
    const { data, error } = await supabase
      .from('user_nfts')
      .update({
        ...nft,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating user NFT:', error)
      throw error
    }
    
    return data
  } else {
    // Insert new NFT
    const { data, error } = await supabase
      .from('user_nfts')
      .insert(nft)
      .select()
      .single()
    
    if (error) {
      console.error('Error storing user NFT:', error)
      throw error
    }
    
    return data
  }
}

/**
 * Get user NFTs
 */
export async function getUserNFTs(userId: string, nftType?: number) {
  const supabase = await createClient()
  
  let query = supabase
    .from('user_nfts')
    .select('*')
    .eq('user_id', userId)
  
  if (nftType !== undefined) {
    query = query.eq('nft_type', nftType)
  }
  
  const { data, error } = await query.order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching user NFTs:', error)
    throw error
  }
  
  return data
}

/**
 * Update user token balance
 */
export async function updateUserTokenBalance(balance: Omit<UserTokenBalance, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()
  
  // Upsert token balance
  const { data, error } = await supabase
    .from('user_token_balances')
    .upsert({
      ...balance,
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,contract_address'
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error updating user token balance:', error)
    throw error
  }
  
  return data
}

/**
 * Get user token balances
 */
export async function getUserTokenBalances(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_token_balances')
    .select('*')
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error fetching user token balances:', error)
    throw error
  }
  
  return data
}

/**
 * Get user transaction history
 */
export async function getUserTransactions(userId: string, limit = 50) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('blockchain_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Error fetching user transactions:', error)
    throw error
  }
  
  return data
}

/**
 * Sync user data from blockchain
 */
export async function syncUserBlockchainData(userId: string, walletAddress: string) {
  try {
    // This would typically be called by a background job
    // to sync user's on-chain data with the database
    
    const supabase = await createClient()
    
    // Get user's current data
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (!user) {
      throw new Error('User not found')
    }
    
    // Here you would:
    // 1. Query blockchain for user's current token balances
    // 2. Query blockchain for user's NFTs
    // 3. Update database with current state
    // 4. This is typically done by a background service
    
    console.log(`Syncing blockchain data for user ${userId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error syncing user blockchain data:', error)
    throw error
  }
}

/**
 * Process game action and record on blockchain if needed
 */
export async function processGameAction(
  userId: string,
  action: string,
  data: any
) {
  const supabase = await createClient()
  
  try {
    // Start transaction
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (!user) {
      throw new Error('User not found')
    }
    
    switch (action) {
      case 'daily_ritual':
        // Award points and potentially mint NFT
        const points = 50
        await supabase
          .from('users')
          .update({
            total_points: user.total_points + points,
            available_points: user.available_points + points
          })
          .eq('id', userId)
        
        // Record transaction for potential blockchain sync
        await recordTransaction({
          user_id: userId,
          wallet_address: user.wallet_address,
          contract_address: '', // Will be filled by sync service
          transaction_hash: '', // Will be filled when actually executed
          transaction_type: 'daily_ritual',
          amount: points.toString(),
          status: 'pending'
        })
        break
        
      case 'spin_wheel':
        // Handle wheel spin results
        const reward = data.reward
        if (reward.type === 'points') {
          await supabase
            .from('users')
            .update({
              total_points: user.total_points + reward.value,
              available_points: user.available_points + reward.value
            })
            .eq('id', userId)
        }
        break
        
      case 'mint_achievement_nft':
        // Record NFT mint request
        await recordTransaction({
          user_id: userId,
          wallet_address: user.wallet_address,
          contract_address: process.env.NEXT_PUBLIC_KABBALAH_NFT_ADDRESS || '',
          transaction_hash: '',
          transaction_type: 'mint_nft',
          token_id: data.tokenId,
          status: 'pending'
        })
        break
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error processing game action:', error)
    throw error
  }
}