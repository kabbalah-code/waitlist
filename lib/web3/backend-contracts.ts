// Backend contract interaction for rewarding users with KCODE tokens
import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '@/lib/contracts'

// Simplified ABIs for backend use
const KCODE_TOKEN_ABI = [
  'function rewardUser(address to, uint256 amount, string memory activity) external',
  'function burnAndTransfer(address from, uint256 totalAmount, uint256 burnPercent, string memory reason) external',
  'function balanceOf(address account) view returns (uint256)',
  'function getCommunityReserveStatus() view returns (uint256 remaining, uint256 spent, uint256 percentRemaining)',
  'function getBurnStats() view returns (uint256 totalBurned, uint256 burnCount)',
  'function COMMUNITY_RESERVE() view returns (address)',
]

const GAME_ECONOMICS_ABI = [
  'function distributeReferralRewards(address user, uint256 amount, string memory activity) external',
]

// Backend wallet configuration
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || NETWORK_CONFIG.rpcUrl

if (!BACKEND_PRIVATE_KEY) {
  console.warn('⚠️  BACKEND_PRIVATE_KEY not set. Contract interactions will fail.')
}

// Initialize provider and signer
let provider: ethers.JsonRpcProvider | null = null
let signer: ethers.Wallet | null = null
let kCodeToken: ethers.Contract | null = null
let gameEconomics: ethers.Contract | null = null

function initializeContracts() {
  if (!BACKEND_PRIVATE_KEY) {
    throw new Error('BACKEND_PRIVATE_KEY not configured')
  }

  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL)
    signer = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider)
    
    kCodeToken = new ethers.Contract(
      CONTRACT_ADDRESSES.KCODE_TOKEN,
      KCODE_TOKEN_ABI,
      signer
    )
    
    gameEconomics = new ethers.Contract(
      CONTRACT_ADDRESSES.GAME_ECONOMICS,
      GAME_ECONOMICS_ABI,
      signer
    )
  }
}

/**
 * Reward user with KCODE tokens (transfers from Community Reserve)
 * @param userAddress - User's wallet address
 * @param kcodeAmount - Amount of KCODE tokens (e.g., 1.5 for 1.5 KCODE)
 * @param activity - Description of activity (e.g., "Daily Ritual", "Task Completion")
 * @returns Transaction hash
 */
export async function rewardUserWithKcode(
  userAddress: string,
  kcodeAmount: number,
  activity: string
): Promise<string> {
  try {
    initializeContracts()
    
    if (!kCodeToken) {
      throw new Error('KCodeToken contract not initialized')
    }

    // Convert KCODE amount to wei (18 decimals)
    const amountWei = ethers.parseEther(kcodeAmount.toString())
    
    console.log(`[Contract] Rewarding ${userAddress} with ${kcodeAmount} KCODE for: ${activity}`)
    
    // Call rewardUser function (transfers from Community Reserve)
    const tx = await kCodeToken.rewardUser(userAddress, amountWei, activity)
    await tx.wait()
    
    console.log(`[Contract] ✅ Reward successful. TX: ${tx.hash}`)
    
    return tx.hash
  } catch (error) {
    console.error('[Contract] Error rewarding user:', error)
    throw error
  }
}

/**
 * Burn tokens and transfer remainder to treasury
 * @param userAddress - User's wallet address
 * @param kcodeAmount - Total amount of KCODE tokens
 * @param burnPercent - Percentage to burn (5000 = 50%)
 * @param reason - Reason for burn (e.g., "Wheel Spin Purchase")
 * @returns Transaction hash
 */
export async function burnAndTransferKcode(
  userAddress: string,
  kcodeAmount: number,
  burnPercent: number,
  reason: string
): Promise<string> {
  try {
    initializeContracts()
    
    if (!kCodeToken) {
      throw new Error('KCodeToken contract not initialized')
    }

    const amountWei = ethers.parseEther(kcodeAmount.toString())
    
    console.log(`[Contract] Burning ${burnPercent/100}% of ${kcodeAmount} KCODE from ${userAddress} for: ${reason}`)
    
    const tx = await kCodeToken.burnAndTransfer(userAddress, amountWei, burnPercent, reason)
    await tx.wait()
    
    console.log(`[Contract] ✅ Burn successful. TX: ${tx.hash}`)
    
    return tx.hash
  } catch (error) {
    console.error('[Contract] Error burning tokens:', error)
    throw error
  }
}

/**
 * Get user's KCODE balance
 * @param userAddress - User's wallet address
 * @returns KCODE balance as number
 */
export async function getUserKcodeBalance(userAddress: string): Promise<number> {
  try {
    initializeContracts()
    
    if (!kCodeToken) {
      throw new Error('KCodeToken contract not initialized')
    }

    const balanceWei = await kCodeToken.balanceOf(userAddress)
    const balance = ethers.formatEther(balanceWei)
    
    return parseFloat(balance)
  } catch (error) {
    console.error('[Contract] Error getting balance:', error)
    return 0
  }
}

/**
 * Get Community Reserve status
 * @returns Reserve status with remaining, spent, and percentage
 */
export async function getCommunityReserveStatus(): Promise<{
  remaining: number
  spent: number
  percentRemaining: number
}> {
  try {
    initializeContracts()
    
    if (!kCodeToken) {
      throw new Error('KCodeToken contract not initialized')
    }

    const status = await kCodeToken.getCommunityReserveStatus()
    
    return {
      remaining: parseFloat(ethers.formatEther(status.remaining)),
      spent: parseFloat(ethers.formatEther(status.spent)),
      percentRemaining: Number(status.percentRemaining)
    }
  } catch (error) {
    console.error('[Contract] Error getting reserve status:', error)
    throw error
  }
}

/**
 * Get burn statistics
 * @returns Total burned and burn count
 */
export async function getBurnStats(): Promise<{
  totalBurned: number
  burnCount: number
}> {
  try {
    initializeContracts()
    
    if (!kCodeToken) {
      throw new Error('KCodeToken contract not initialized')
    }

    const stats = await kCodeToken.getBurnStats()
    
    return {
      totalBurned: parseFloat(ethers.formatEther(stats.totalBurned)),
      burnCount: Number(stats.burnCount)
    }
  } catch (error) {
    console.error('[Contract] Error getting burn stats:', error)
    throw error
  }
}

/**
 * Distribute referral rewards through GameEconomics contract
 * @param userAddress - User's wallet address
 * @param kcodeAmount - Amount of KCODE earned by user
 * @param activity - Activity description
 * @returns Transaction hash
 */
export async function distributeReferralRewards(
  userAddress: string,
  kcodeAmount: number,
  activity: string
): Promise<string | null> {
  try {
    initializeContracts()
    
    if (!gameEconomics) {
      throw new Error('GameEconomics contract not initialized')
    }

    const amountWei = ethers.parseEther(kcodeAmount.toString())
    
    console.log(`[Contract] Distributing referral rewards for ${userAddress}: ${kcodeAmount} KCODE`)
    
    const tx = await gameEconomics.distributeReferralRewards(userAddress, amountWei, activity)
    await tx.wait()
    
    console.log(`[Contract] ✅ Referral rewards distributed. TX: ${tx.hash}`)
    
    return tx.hash
  } catch (error) {
    console.error('[Contract] Error distributing referral rewards:', error)
    // Don't throw - referral rewards are optional
    return null
  }
}

// Export contract instances for advanced use
export { provider, signer, kCodeToken, gameEconomics }
