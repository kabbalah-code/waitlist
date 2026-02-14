import { type NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import { createClient } from "@/lib/supabase/server"

// Contract ABI для mintGameRewards функции
const KCODE_TOKEN_ABI = [
  "function mintGameRewards(address to, uint256 amount) external",
  "function authorizedMinters(address) external view returns (bool)",
  "function setAuthorizedMinter(address minter, bool authorized) external"
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

    // Проверяем что это внутренний вызов (добавим API ключ)
    const apiKey = request.headers.get("x-api-key")
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: "Unauthorized" 
      }, { status: 401 })
    }

    console.log("[API] POST /api/web3/mint-reward", { 
      walletAddress: walletAddress.slice(0, 10) + "...", 
      points, 
      activity 
    })

    // Конвертируем поинты в токены
    const tokenAmount = Math.floor(points / POINTS_TO_TOKEN_RATE)
    
    if (tokenAmount === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Not enough points for token reward" 
      }, { status: 400 })
    }

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
      const supabase = await createClient()
      await supabase.from("blockchain_transactions").insert({
        user_wallet: walletAddress,
        transaction_hash: receipt.hash,
        transaction_type: "mint_reward",
        amount: tokenAmount.toString(),
        points_converted: points,
        activity: activity,
        status: "confirmed",
        block_number: receipt.blockNumber,
        gas_used: receipt.gasUsed.toString()
      })
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
    console.error("[API] Error in POST /api/web3/mint-reward:", error)
    
    let errorMessage = "Failed to mint reward tokens"
    if (error instanceof Error) {
      if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient gas funds in backend wallet"
      } else if (error.message.includes("Not authorized")) {
        errorMessage = "Backend not authorized for minting"
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