import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export interface DbUser {
  id: string
  wallet_address: string
  twitter_username: string | null
  twitter_verified_at: string | null
  telegram_username: string | null
  discord_username: string | null
  wallet_number: number
  level: number
  total_kcode: number  // Changed from total_points
  tokens_minted: number  // Track on-chain minted tokens
  current_streak: number
  longest_streak: number
  last_ritual_date: string | null
  free_spins: number
  referral_code: string
  referred_by_code: string | null
  created_at: string
}

// Calculate wallet number from address
export function calculateWalletNumber(address: string): number {
  const hex = address.slice(2).toLowerCase()
  let sum = 0
  for (const char of hex) {
    sum += Number.parseInt(char, 16)
  }
  // Reduce to single digit (1-9)
  while (sum > 9) {
    sum = sum
      .toString()
      .split("")
      .reduce((a, b) => a + Number.parseInt(b), 0)
  }
  return sum || 9
}

export async function getOrCreateUser(walletAddress: string): Promise<DbUser | null> {
  const supabase = await createClient()
  const normalizedAddress = walletAddress.toLowerCase()

  // ✅ Обработка ошибок Supabase
  const { data: existingUser, error: selectError } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", normalizedAddress)
    .maybeSingle()

  if (selectError) {
    console.error("[v0] Error fetching user:", selectError)
    throw new Error(`Database error while fetching user: ${selectError.message}`)
  }

  if (existingUser) {
    return existingUser as DbUser
  }

  const referralCode = `KC${normalizedAddress.slice(2, 8).toUpperCase()}`

  // Create new user with welcome bonus
  const walletNumber = calculateWalletNumber(walletAddress)
  const welcomeBonus = 1 // 1 KCODE welcome bonus
  
  // ✅ Обработка ошибок при создании пользователя
  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({
      wallet_address: normalizedAddress,
      wallet_number: walletNumber,
      total_kcode: welcomeBonus,
      tokens_minted: 0, // Will be updated when tokens are minted on-chain
      free_spins: 1,
      referral_code: referralCode,
    })
    .select()
    .single()

  if (insertError) {
    console.error("[v0] Error creating user:", insertError)
    throw new Error(`Database error while creating user: ${insertError.message}`)
  }

  if (!newUser) {
    throw new Error("Failed to create user: no data returned")
  }

  // ✅ Record welcome bonus transaction с обработкой ошибок
  const { error: transactionError } = await supabase.from("kcode_transactions").insert({
    user_id: newUser.id,
    amount: welcomeBonus,
    type: "welcome_bonus",
    description: "Welcome to Kabbalah Code!",
  })

  if (transactionError) {
    console.error("[v0] Error recording welcome bonus transaction:", transactionError)
    // Не откатываем создание пользователя, так как это не критично
  }

  return newUser as DbUser
}

export async function getUserByWallet(walletAddress: string): Promise<DbUser | null> {
  // Use service role key for server-side operations
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // ✅ Обработка ошибок Supabase
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .maybeSingle()

  if (error) {
    console.error("[v0] Error fetching user by wallet:", error)
    throw new Error(`Database error while fetching user: ${error.message}`)
  }

  return data as DbUser | null
}

export async function updateUserKcode(
  userId: string,
  kcodeDelta: number,
  type: string,
  description?: string,
  txHash?: string,
): Promise<boolean> {
  const supabase = await createClient()

  // ✅ Get current user с обработкой ошибок
  const { data: user, error: selectError } = await supabase
    .from("users")
    .select("total_kcode, tokens_minted")
    .eq("id", userId)
    .single()

  if (selectError) {
    console.error("[v0] Error fetching user for KCODE update:", selectError)
    return false
  }

  if (!user) {
    console.error("[v0] User not found for KCODE update:", userId)
    return false
  }

  // ✅ Update KCODE с обработкой ошибок
  const newTotal = Math.max(0, user.total_kcode + kcodeDelta)
  const newLevel = calculateLevel(newTotal)

  const { error: updateError } = await supabase
    .from("users")
    .update({
      total_kcode: newTotal,
      level: newLevel,
    })
    .eq("id", userId)

  if (updateError) {
    console.error("[v0] Error updating user KCODE:", updateError)
    return false
  }

  // ✅ Record transaction с обработкой ошибок
  const { error: transactionError } = await supabase.from("kcode_transactions").insert({
    user_id: userId,
    amount: kcodeDelta,
    type,
    description,
    tx_hash: txHash,
  })

  if (transactionError) {
    console.error("[v0] Error recording KCODE transaction:", transactionError)
    // Не возвращаем false, так как основная операция уже выполнена
  }

  return true
}

export function calculateLevel(totalKcode: number): number {
  // Экспоненциальная прогрессия - каждый уровень требует больше KCODE
  if (totalKcode < 10) return 1      // 0-10 KCODE
  if (totalKcode < 25) return 2      // 10-25 KCODE
  if (totalKcode < 50) return 3      // 25-50 KCODE
  if (totalKcode < 100) return 4     // 50-100 KCODE
  if (totalKcode < 200) return 5     // 100-200 KCODE
  if (totalKcode < 350) return 6     // 200-350 KCODE
  if (totalKcode < 550) return 7     // 350-550 KCODE
  if (totalKcode < 800) return 8     // 550-800 KCODE
  if (totalKcode < 1100) return 9    // 800-1100 KCODE
  if (totalKcode < 1500) return 10   // 1100-1500 KCODE
  
  // После 10 уровня: каждые 500 KCODE = +1 уровень
  const level = Math.floor((totalKcode - 1500) / 500) + 10
  return Math.min(level, 75)
}

export function getKcodeForLevel(level: number): number {
  // Возвращает минимальное количество KCODE для достижения уровня
  if (level <= 1) return 0
  if (level === 2) return 10
  if (level === 3) return 25
  if (level === 4) return 50
  if (level === 5) return 100
  if (level === 6) return 200
  if (level === 7) return 350
  if (level === 8) return 550
  if (level === 9) return 800
  if (level === 10) return 1100
  if (level === 11) return 1500
  
  // После 11 уровня: каждые 500 KCODE
  return 1500 + (level - 11) * 500
}
