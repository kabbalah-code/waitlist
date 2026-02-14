import { type NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import { createClient } from "@/lib/supabase/server"
import type { NFTReward } from "@/lib/rewards/alternative-system"

// Contract ABI для NFT минта
const KABBALH_NFT_ABI = [
  "function mintReward(address to, string memory tokenURI) external returns (uint256)",
  "function authorizedMinters(address) external view returns (bool)",
  "function tokenCounter() external view returns (uint256)"
]

export async function POST(request: NextRequest) {
  try {
    const { nftReward, userWallet } = await request.json()

    // Валидация
    if (!nftReward || !userWallet) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
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

    console.log("[API] POST /api/web3/mint-nft", { 
      nftId: nftReward.id,
      userWallet: userWallet.slice(0, 10) + "...",
      rarity: nftReward.rarity,
      category: nftReward.category
    })

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
    
    // Подключаемся к NFT контракту
    const nftContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_KABBALH_NFT_ADDRESS!,
      KABBALH_NFT_ABI,
      wallet
    )

    // Проверяем что наш backend авторизован для минта
    const isAuthorized = await nftContract.authorizedMinters(wallet.address)
    if (!isAuthorized) {
      console.error("[API] Backend wallet not authorized for NFT minting")
      return NextResponse.json({ 
        success: false, 
        error: "Backend not authorized for NFT minting" 
      }, { status: 500 })
    }

    // Создаем metadata URI (в реальности это должно быть IPFS или централизованное хранилище)
    const tokenURI = await createTokenURI(nftReward)

    // Выполняем минт транзакцию
    const tx = await nftContract.mintReward(userWallet, tokenURI)

    console.log("[API] NFT mint transaction sent:", tx.hash)

    // Ждем подтверждения
    const receipt = await tx.wait()
    
    if (receipt.status !== 1) {
      throw new Error("NFT mint transaction failed")
    }

    // Получаем token ID из событий
    const tokenId = await getTokenIdFromReceipt(receipt, nftContract)

    console.log("[API] NFT mint transaction confirmed:", {
      hash: receipt.hash,
      tokenId: tokenId?.toString()
    })

    // Сохраняем NFT в базу данных
    const supabase = await createClient()
    
    // Получаем user_id по wallet
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", userWallet)
      .single()

    if (userData) {
      await supabase.from("nft_rewards").insert({
        user_id: userData.id,
        user_wallet: userWallet,
        nft_id: nftReward.id,
        name: nftReward.name,
        description: nftReward.description,
        rarity: nftReward.rarity,
        category: nftReward.category,
        metadata: nftReward.metadata,
        transaction_hash: receipt.hash,
        token_id: tokenId ? Number(tokenId) : null,
        is_minted: true
      })

      // Также сохраняем в blockchain_transactions для отслеживания
      await supabase.from("blockchain_transactions").insert({
        user_wallet: userWallet,
        transaction_hash: receipt.hash,
        transaction_type: "mint_nft",
        amount: "1",
        activity: nftReward.category,
        status: "confirmed",
        block_number: receipt.blockNumber,
        gas_used: receipt.gasUsed.toString()
      })
    }

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      tokenId: tokenId?.toString(),
      nftReward: {
        ...nftReward,
        tokenId: tokenId?.toString(),
        transactionHash: receipt.hash
      },
      blockNumber: receipt.blockNumber
    })

  } catch (error) {
    console.error("[API] Error in POST /api/web3/mint-nft:", error)
    
    let errorMessage = "Failed to mint NFT reward"
    if (error instanceof Error) {
      if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient gas funds in backend wallet"
      } else if (error.message.includes("Not authorized")) {
        errorMessage = "Backend not authorized for NFT minting"
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

/**
 * Создает metadata URI для NFT
 */
async function createTokenURI(nftReward: NFTReward): Promise<string> {
  // В реальной реализации здесь должна быть загрузка в IPFS
  // Пока используем простой JSON с base64 encoding
  
  const metadata = {
    name: nftReward.name,
    description: nftReward.description,
    image: nftReward.metadata.image,
    attributes: nftReward.metadata.attributes,
    external_url: `${process.env.NEXT_PUBLIC_APP_URL}/nft/${nftReward.id}`,
    background_color: getRarityColor(nftReward.rarity),
    animation_url: null,
    youtube_url: null
  }

  // Конвертируем в base64 data URI
  const jsonString = JSON.stringify(metadata, null, 2)
  const base64 = Buffer.from(jsonString).toString('base64')
  
  return `data:application/json;base64,${base64}`
}

/**
 * Получает цвет фона для редкости NFT
 */
function getRarityColor(rarity: string): string {
  const colors = {
    common: "808080",    // Серый
    rare: "0070f3",      // Синий
    epic: "7c3aed",      // Фиолетовый
    legendary: "f59e0b"  // Золотой
  }
  
  return colors[rarity as keyof typeof colors] || colors.common
}

/**
 * Извлекает token ID из receipt события
 */
async function getTokenIdFromReceipt(
  receipt: ethers.TransactionReceipt, 
  contract: ethers.Contract
): Promise<bigint | null> {
  try {
    // Ищем событие Transfer в логах
    const transferTopic = ethers.id("Transfer(address,address,uint256)")
    
    for (const log of receipt.logs) {
      if (log.topics[0] === transferTopic && log.address.toLowerCase() === contract.target.toString().toLowerCase()) {
        // Декодируем tokenId из третьего параметра события Transfer
        const tokenId = BigInt(log.topics[3])
        return tokenId
      }
    }
    
    // Если не нашли в событиях, пробуем получить текущий counter
    const currentCounter = await contract.tokenCounter()
    return currentCounter - 1n // Предыдущий заминченный токен
    
  } catch (error) {
    console.error("[API] Error extracting token ID:", error)
    return null
  }
}