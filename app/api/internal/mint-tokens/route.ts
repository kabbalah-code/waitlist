import { type NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import { createClient } from "@/lib/supabase/server"

// Contract ABI для mintGameRewards функции
const KCODE_TOKEN_ABI = [
  "function mintGameRewards(address to, uint256 amount) external",
  "function authorizedMinters(address) external view returns (bool)"
]

// Конвертация поинтов в токены (1 поинт = 0.01 KCODE)
const POINTS_TO_TOKEN_RATE = 100 // 100 поинтов = 1 KCODE токен

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, points, activity } = await request.json()

    // Валидация
    if (!walletAddress || !points || !activity) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 })
    }

    if (points <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Points must be positive" 
      }, { status: 400 })
    }

    // Проверяем внутренний API ключ
    const apiKey = request.headers.get("x-api-key")
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: "Unauthorized" 
      }, { status: 401 })
    }

    console.log("[API] POST /api/internal/mint-tokens", { 
      walletAddress: walletAddress.slice(0, 10) + "...", 
      points, 
      activity 
    })

    // Конвертируем поинты в токены (1 KCODE = 100 points)
    // Используем точное деление без округления для поддержки дробных токенов
    const tokenAmount = points / POINTS_TO_TOKEN_RATE
    
    if (tokenAmount <= 0) {
      console.error("[API] Invalid token amount:", tokenAmount, "from points:", points)
      return NextResponse.json({ 
        success: false, 
        error: "Invalid token amount" 
      }, { status: 400 })
    }

    console.log("[API] Converting", points, "points to", tokenAmount, "KCODE tokens")

    // Настройка провайдера и кошелька
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL)
    const privateKey = process.env.GAME_BACKEND_PRIVATE_KEY
    
    if (!privateKey) {
      console.error("[API] Missing GAME_BACKEND_PRIVATE_KEY")
      return NextResponse.json({ 
        success: false, 
        error: "Backend wallet not configured" 
      }, { status: 500 })
    }

    const wallet = new ethers.Wallet(privateKey, provider)
    
    // Подключаемся к контракту
    const tokenContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS!,
      KCODE_TOKEN_ABI,
      wallet
    )

    // Проверяем что наш backend авторизован для минта
    const isAuthorized = await tokenContract.authorizedMinters(wallet.address)
    if (!isAuthorized) {
      console.error("[API] Backend wallet not authorized for minting")
      return NextResponse.json({ 
        success: false, 
        error: "Backend not authorized for minting" 
      }, { status: 500 })
    }

    // Конвертируем в wei (18 decimals)
    const amountInWei = ethers.parseEther(tokenAmount.toString())

    // Выполняем минт транзакцию
    const tx = await tokenContract.mintGameRewards(
      walletAddress,
      amountInWei
    )

    console.log("[API] Mint transaction sent:", tx.hash)

    // Ждем подтверждения
    const receipt = await tx.wait()
    
    if (receipt.status !== 1) {
      throw new Error("Transaction failed")
    }

    console.log("[API] Mint transaction confirmed:", receipt.hash)

    // Сохраняем в базу данных для отслеживания
    try {
      // Используем service role client для обхода RLS
      const { createClient: createServiceClient } = await import("@supabase/supabase-js")
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      // Get user ID for the wallet address
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single()

      if (userError) {
        console.error("[API] Error finding user:", userError)
      }

      const { error: insertError } = await supabase.from("blockchain_transactions").insert({
        user_id: userData?.id || null,
        wallet_address: walletAddress,
        contract_address: process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS,
        transaction_hash: receipt.hash,
        transaction_type: "mint",
        amount: tokenAmount.toString(),
        status: "confirmed",
        block_number: receipt.blockNumber,
        gas_used: receipt.gasUsed.toString(),
        description: getActivityDescription(activity, tokenAmount)
      })
      
      if (insertError) {
        console.error("[API] Error inserting blockchain transaction:", insertError)
      } else {
        console.log("[API] ✅ Blockchain transaction saved to database")
      }
    } catch (dbError) {
      console.error("[API] Error saving to database:", dbError)
      // Не блокируем ответ, так как транзакция уже выполнена
    }

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      tokensAwarded: tokenAmount,
      pointsConverted: points,
      activity: activity,
      blockNumber: receipt.blockNumber
    })

  } catch (error) {
    console.error("[API] Error in POST /api/internal/mint-tokens:", error)
    
    let errorMessage = "Failed to mint reward tokens"
    if (error instanceof Error) {
      if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient gas funds in backend wallet"
      } else if (error.message.includes("Not authorized")) {
        errorMessage = "Backend not authorized for minting"
      } else if (error.message.includes("Would exceed max supply")) {
        errorMessage = "Maximum token supply reached - switching to alternative rewards"
        console.warn("[API] 🚨 MAX_SUPPLY reached! Switching to alternative reward system")
        
        // Implement alternative reward system
        try {
          const { awardAlternativeReward } = await import("@/lib/rewards/alternative-system")
          
          // Get user data from database
          const supabase = await createClient()
          const { data: userData } = await supabase
            .from("users")
            .select("id, level, wallet_address")
            .eq("wallet_address", walletAddress)
            .single()
          
          if (userData) {
            const alternativeReward = await awardAlternativeReward(
              userData.id,
              walletAddress,
              activity,
              points,
              userData.level || 1,
              0 // streakBonus - можно добавить позже
            )
            
            // Save alternative reward to database
            await supabase.from("alternative_rewards").insert({
              user_id: userData.id,
              user_wallet: walletAddress,
              reward_type: alternativeReward.type,
              reward_data: alternativeReward.reward,
              activity: activity,
              points_earned: points,
              message: alternativeReward.message,
              created_at: new Date().toISOString()
            })
            
            return NextResponse.json({
              success: true,
              maxSupplyReached: true,
              alternativeReward: {
                type: alternativeReward.type,
                message: alternativeReward.message,
                reward: alternativeReward.reward
              },
              tokensAwarded: 0,
              pointsConverted: points,
              activity: activity
            })
          }
        } catch (altError) {
          console.error("[API] Error awarding alternative reward:", altError)
        }
        
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 })
  }
}


// Helper function to generate activity description
function getActivityDescription(activity: string, amount: number): string {
  const descriptions: Record<string, string> = {
    'wheel_spin': 'Wheel reward',
    'wheel_jackpot': 'Jackpot',
    'daily_ritual': 'Daily Ritual',
    'task_completion': 'Task reward',
    'telegram_connection': 'Telegram connected',
    'discord_connection': 'Discord connected',
    'twitter_connection': 'Twitter connected',
    'referral_reward': 'Referral bonus'
  }
  return descriptions[activity] || 'Reward'
}
