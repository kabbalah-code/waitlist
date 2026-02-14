import { type NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import { createClient } from "@/lib/supabase/server"

// Contract ABI для проверки MAX_SUPPLY
const KCODE_TOKEN_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function MAX_SUPPLY() external view returns (uint256)"
]

export async function GET(request: NextRequest) {
  try {
    console.log("[API] GET /api/web3/max-supply-status")

    // Проверяем кэшированный статус в базе данных
    const supabase = await createClient()
    const { data: cachedStatus } = await supabase
      .from("system_settings")
      .select("value, updated_at")
      .eq("key", "max_supply_reached")
      .single()

    // Если статус кэширован и обновлялся недавно (< 1 часа), возвращаем его
    if (cachedStatus && cachedStatus.updated_at) {
      const lastUpdate = new Date(cachedStatus.updated_at)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      
      if (lastUpdate > hourAgo) {
        return NextResponse.json({
          success: true,
          maxSupplyReached: cachedStatus.value === true,
          cached: true,
          lastChecked: cachedStatus.updated_at
        })
      }
    }

    // Проверяем актуальный статус в блокчейне
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL)
    const tokenContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS!,
      KCODE_TOKEN_ABI,
      provider
    )

    const [totalSupply, maxSupply] = await Promise.all([
      tokenContract.totalSupply(),
      tokenContract.MAX_SUPPLY()
    ])

    const maxSupplyReached = totalSupply >= maxSupply
    const supplyPercentage = (Number(totalSupply) / Number(maxSupply)) * 100

    console.log("[API] Supply check:", {
      totalSupply: ethers.formatEther(totalSupply),
      maxSupply: ethers.formatEther(maxSupply),
      percentage: supplyPercentage.toFixed(2) + "%",
      maxSupplyReached
    })

    // Обновляем кэш в базе данных
    await supabase
      .from("system_settings")
      .upsert([
        {
          key: "max_supply_reached",
          value: maxSupplyReached,
          description: "Whether MAX_SUPPLY has been reached for KCODE tokens"
        },
        {
          key: "last_supply_check",
          value: new Date().toISOString(),
          description: "Last time MAX_SUPPLY was checked"
        }
      ])

    // Если MAX_SUPPLY достигнут впервые, активируем альтернативную систему
    if (maxSupplyReached && cachedStatus?.value !== true) {
      console.warn("[API] 🚨 MAX_SUPPLY reached for the first time! Activating alternative rewards")
      
      await supabase
        .from("system_settings")
        .upsert({
          key: "alternative_rewards_active",
          value: true,
          description: "Whether alternative reward system is active"
        })

      // Можно добавить уведомления администраторам
      // await notifyAdmins("MAX_SUPPLY reached - alternative rewards activated")
    }

    return NextResponse.json({
      success: true,
      maxSupplyReached,
      supplyInfo: {
        totalSupply: ethers.formatEther(totalSupply),
        maxSupply: ethers.formatEther(maxSupply),
        remaining: ethers.formatEther(maxSupply - totalSupply),
        percentage: supplyPercentage
      },
      cached: false,
      lastChecked: new Date().toISOString()
    })

  } catch (error) {
    console.error("[API] Error checking MAX_SUPPLY status:", error)
    
    return NextResponse.json({ 
      success: false, 
      error: "Failed to check MAX_SUPPLY status",
      maxSupplyReached: false // Безопасное значение по умолчанию
    }, { status: 500 })
  }
}

// Endpoint для принудительного обновления статуса (только для админов)
export async function POST(request: NextRequest) {
  try {
    const { forceUpdate } = await request.json()
    
    if (!forceUpdate) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing forceUpdate parameter" 
      }, { status: 400 })
    }

    // Проверяем права доступа (можно добавить проверку админских прав)
    const apiKey = request.headers.get("x-api-key")
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: "Unauthorized" 
      }, { status: 401 })
    }

    console.log("[API] POST /api/web3/max-supply-status - Force update requested")

    // Принудительно обновляем статус
    const response = await GET(request)
    const data = await response.json()

    return NextResponse.json({
      ...data,
      forceUpdated: true
    })

  } catch (error) {
    console.error("[API] Error in force update:", error)
    
    return NextResponse.json({ 
      success: false, 
      error: "Failed to force update MAX_SUPPLY status" 
    }, { status: 500 })
  }
}