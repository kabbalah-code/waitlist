/**
 * Wheel Spin Purchase with Blockchain Integration
 */

import { ethers } from 'ethers'
import { contractService } from './contracts'
import { apiClient } from '@/lib/api/client'
import { POINTS_CONFIG } from '@/lib/points/calculator'

export interface WheelPurchaseResult {
  success: boolean
  transactionHash?: string
  tokensSpent?: number
  freeSpinsAdded?: number
  newFreeSpins?: number
  message?: string
  error?: string
}

/**
 * Purchase a wheel spin using KCODE tokens from MetaMask
 */
export async function purchaseWheelSpin(): Promise<WheelPurchaseResult> {
  try {
    console.log("[WheelPurchase] Starting wheel spin purchase...")
    
    // Initialize contract service
    await contractService.initialize()
    
    // Get user's wallet address
    const signer = await contractService['signer']
    if (!signer) {
      throw new Error("Wallet not connected")
    }
    
    const walletAddress = await signer.getAddress()
    console.log("[WheelPurchase] Wallet address:", walletAddress.slice(0, 10) + "...")
    
    // Check token balance
    const balance = await contractService.getTokenBalance(walletAddress)
    const balanceNum = parseFloat(balance)
    
    console.log("[WheelPurchase] Current KCODE balance:", balanceNum)
    
    if (balanceNum < POINTS_CONFIG.EXTRA_SPIN_COST) {
      return {
        success: false,
        error: `Insufficient KCODE balance. Need ${POINTS_CONFIG.EXTRA_SPIN_COST} KCODE, have ${balanceNum.toFixed(2)}`
      }
    }
    
    // For now, we'll use the transfer method to send tokens to a burn address
    // In a real implementation, you'd have a specific contract method for wheel spins
    const kCodeToken = contractService['kCodeToken']
    if (!kCodeToken) {
      throw new Error("KCODE token contract not initialized")
    }
    
    // Transfer tokens to burn address (0x000...000 or contract address)
    const burnAddress = "0x000000000000000000000000000000000000dEaD" // Standard burn address
    const amountWei = ethers.parseEther(POINTS_CONFIG.EXTRA_SPIN_COST.toString())
    
    console.log("[WheelPurchase] Sending transaction to burn", POINTS_CONFIG.EXTRA_SPIN_COST, "KCODE...")
    
    // Send transaction
    const tx = await kCodeToken.transfer(burnAddress, amountWei)
    console.log("[WheelPurchase] Transaction sent:", tx.hash)
    
    // Wait for confirmation
    console.log("[WheelPurchase] Waiting for confirmation...")
    const receipt = await tx.wait()
    
    if (!receipt || receipt.status !== 1) {
      throw new Error("Transaction failed")
    }
    
    console.log("[WheelPurchase] Transaction confirmed:", receipt.hash)
    
    // Call backend API to record the purchase
    const apiResponse = await apiClient.post('/api/wheel/purchase-spin', {
      transactionHash: receipt.hash,
      walletAddress: walletAddress
    })
    
    if (!apiResponse.success) {
      console.error("[WheelPurchase] API call failed:", apiResponse.error)
      return {
        success: false,
        error: apiResponse.error || "Failed to record purchase"
      }
    }
    
    console.log("[WheelPurchase] Purchase completed successfully!")
    
    return {
      success: true,
      transactionHash: receipt.hash,
      tokensSpent: POINTS_CONFIG.EXTRA_SPIN_COST,
      freeSpinsAdded: apiResponse.data?.freeSpinsAdded || 1,
      newFreeSpins: apiResponse.data?.newFreeSpins || 0,
      message: apiResponse.data?.message || "Wheel spin purchased successfully!"
    }
    
  } catch (error) {
    console.error("[WheelPurchase] Error:", error)
    
    let errorMessage = "Failed to purchase wheel spin"
    
    if (error instanceof Error) {
      if (error.message.includes("user rejected")) {
        errorMessage = "Transaction cancelled by user"
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient ETH for gas fees"
      } else {
        errorMessage = error.message
      }
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Check if user can purchase wheel spins (has enough tokens and ETH for gas)
 */
export async function canPurchaseWheelSpin(): Promise<{
  canPurchase: boolean
  kcodeBalance: number
  ethBalance: number
  error?: string
}> {
  try {
    await contractService.initialize()
    
    const signer = await contractService['signer']
    if (!signer) {
      return {
        canPurchase: false,
        kcodeBalance: 0,
        ethBalance: 0,
        error: "Wallet not connected"
      }
    }
    
    const walletAddress = await signer.getAddress()
    
    // Get KCODE balance
    const kcodeBalance = parseFloat(await contractService.getTokenBalance(walletAddress))
    
    // Get ETH balance
    const provider = contractService['provider']
    const ethBalanceWei = await provider!.getBalance(walletAddress)
    const ethBalance = parseFloat(ethers.formatEther(ethBalanceWei))
    
    const canPurchase = kcodeBalance >= POINTS_CONFIG.EXTRA_SPIN_COST && ethBalance > 0.001 // Need some ETH for gas
    
    return {
      canPurchase,
      kcodeBalance,
      ethBalance
    }
    
  } catch (error) {
    // Silently handle errors - MetaMask might not be connected
    console.log("[WheelPurchase] MetaMask not available:", error instanceof Error ? error.message : 'Unknown error')
    return {
      canPurchase: false,
      kcodeBalance: 0,
      ethBalance: 0,
      error: "MetaMask not connected to Polygon Amoy"
    }
  }
}