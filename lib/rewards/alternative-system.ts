/**
 * Alternative Reward System - активируется после достижения MAX_SUPPLY
 */

export interface NFTReward {
  id: string
  name: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  category: 'ritual' | 'wheel' | 'task' | 'achievement'
  metadata: {
    image: string
    attributes: Array<{
      trait_type: string
      value: string | number
    }>
  }
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  tier: number
  progress: number
  maxProgress: number
  unlocked: boolean
  unlockedAt?: string
}

export interface PremiumReward {
  id: string
  type: 'vip_access' | 'early_access' | 'consultation' | 'custom_feature'
  name: string
  description: string
  duration?: number // в днях
  features: string[]
}

// Конфигурация альтернативных наград
export const ALTERNATIVE_REWARDS_CONFIG = {
  // NFT награды за ритуалы
  RITUAL_NFTS: {
    common: { probability: 0.7, name: "Daily Prophecy" },
    rare: { probability: 0.2, name: "Mystical Vision" },
    epic: { probability: 0.08, name: "Divine Revelation" },
    legendary: { probability: 0.02, name: "Cosmic Truth" }
  },

  // NFT награды за колесо фортуны
  WHEEL_NFTS: {
    common: { probability: 0.6, name: "Fortune Symbol" },
    rare: { probability: 0.25, name: "Lucky Charm" },
    epic: { probability: 0.12, name: "Wheel Artifact" },
    legendary: { probability: 0.03, name: "Fortune's Blessing" }
  },

  // Достижения
  ACHIEVEMENTS: {
    RITUAL_MASTER: { name: "Ritual Master", maxProgress: 100 },
    FORTUNE_SEEKER: { name: "Fortune Seeker", maxProgress: 1000 },
    SOCIAL_BUTTERFLY: { name: "Social Butterfly", maxProgress: 50 },
    STREAK_CHAMPION: { name: "Streak Champion", maxProgress: 365 }
  },

  // Премиум награды
  PREMIUM_REWARDS: {
    VIP_ACCESS: { duration: 30, name: "VIP Access" },
    EARLY_ACCESS: { duration: 90, name: "Beta Tester" },
    CONSULTATION: { duration: 1, name: "Personal Reading" },
    CUSTOM_RITUAL: { duration: 60, name: "Custom Rituals" }
  }
}

/**
 * Определяет тип альтернативной награды на основе активности и оставшегося supply
 */
export function determineAlternativeReward(
  activity: string,
  points: number,
  userLevel: number,
  streakBonus: number = 0,
  supplyPercentageUsed: number = 100 // Процент использованного supply (100% = MAX_SUPPLY достигнут)
): 'nft' | 'achievement' | 'premium' {
  
  // Бонус для ранних пользователей: чем меньше supply использовано, тем лучше награды
  const earlyAdopterBonus = Math.max(0, (100 - supplyPercentageUsed) / 10) // 0-10 бонус
  const adjustedPoints = points + (points * earlyAdopterBonus / 100)
  
  // Высокие награды (джекпот, большие стрики) → премиум
  if (adjustedPoints >= 500 || streakBonus >= 200) {
    return 'premium'
  }
  
  // Средние награды → NFT (порог снижается для ранних пользователей)
  const nftThreshold = Math.max(50, 100 - earlyAdopterBonus * 5)
  if (adjustedPoints >= nftThreshold || activity === 'daily_ritual') {
    return 'nft'
  }
  
  // Малые награды → достижения
  return 'achievement'
}

/**
 * Генерирует NFT награду с учетом редкости для ранних пользователей
 */
export function generateNFTReward(
  activity: string,
  points: number,
  userWallet: string,
  supplyPercentageUsed: number = 100
): NFTReward {
  
  const category = activity === 'daily_ritual' ? 'ritual' : 
                  activity === 'wheel_spin' ? 'wheel' : 'task'
  
  // Бонус редкости для ранних пользователей
  const earlyAdopterBonus = Math.max(0, (100 - supplyPercentageUsed) / 20) // 0-5 бонус
  const adjustedPoints = points + (points * earlyAdopterBonus / 100)
  
  const rarity = determineNFTRarity(adjustedPoints, category, supplyPercentageUsed)
  const config = category === 'ritual' ? 
    ALTERNATIVE_REWARDS_CONFIG.RITUAL_NFTS[rarity] :
    ALTERNATIVE_REWARDS_CONFIG.WHEEL_NFTS[rarity]
  
  // Специальные названия для ранних пользователей
  const earlyAdopterSuffix = supplyPercentageUsed < 95 ? " (Early Adopter)" : ""
  
  return {
    id: generateNFTId(userWallet, activity),
    name: `${config.name} #${Date.now()}${earlyAdopterSuffix}`,
    description: `Earned through ${activity} on ${new Date().toLocaleDateString()}. Supply used: ${supplyPercentageUsed.toFixed(1)}%`,
    rarity,
    category,
    metadata: {
      image: `/nft/${category}/${rarity}.png`,
      attributes: [
        { trait_type: "Activity", value: activity },
        { trait_type: "Points Earned", value: points },
        { trait_type: "Adjusted Points", value: Math.floor(adjustedPoints) },
        { trait_type: "Rarity", value: rarity },
        { trait_type: "Supply Used %", value: supplyPercentageUsed.toFixed(1) },
        { trait_type: "Early Adopter Bonus", value: earlyAdopterBonus.toFixed(1) },
        { trait_type: "Date", value: new Date().toISOString().split('T')[0] },
        { trait_type: "Wallet", value: userWallet.slice(0, 8) }
      ]
    }
  }
}

/**
 * Определяет редкость NFT на основе поинтов и supply usage
 */
function determineNFTRarity(
  points: number, 
  category: string, 
  supplyPercentageUsed: number = 100
): NFTReward['rarity'] {
  const config = category === 'ritual' ? 
    ALTERNATIVE_REWARDS_CONFIG.RITUAL_NFTS :
    ALTERNATIVE_REWARDS_CONFIG.WHEEL_NFTS
  
  // Бонус редкости для ранних пользователей
  const earlyAdopterMultiplier = supplyPercentageUsed < 95 ? 2 : 1
  
  let random = Math.random()
  
  // Увеличиваем шансы на редкие NFT для ранних пользователей
  if (earlyAdopterMultiplier > 1) {
    // Сдвигаем вероятность в сторону более редких NFT
    random = random * 0.7 // Уменьшаем случайность для лучших шансов
  }
  
  let cumulative = 0
  
  for (const [rarity, data] of Object.entries(config)) {
    cumulative += data.probability
    if (random <= cumulative) {
      return rarity as NFTReward['rarity']
    }
  }
  
  return 'common'
}

/**
 * Генерирует уникальный ID для NFT
 */
function generateNFTId(wallet: string, activity: string): string {
  const timestamp = Date.now()
  const walletShort = wallet.slice(2, 8)
  const activityCode = activity.slice(0, 3).toUpperCase()
  return `${activityCode}-${walletShort}-${timestamp}`
}

/**
 * Обновляет прогресс достижения
 */
export function updateAchievementProgress(
  userId: string,
  activity: string,
  currentAchievements: Achievement[]
): Achievement[] {
  
  const achievementMap: Record<string, string> = {
    'daily_ritual': 'RITUAL_MASTER',
    'wheel_spin': 'FORTUNE_SEEKER',
    'twitter_task': 'SOCIAL_BUTTERFLY'
  }
  
  const achievementId = achievementMap[activity]
  if (!achievementId) return currentAchievements
  
  return currentAchievements.map(achievement => {
    if (achievement.id === achievementId && !achievement.unlocked) {
      const newProgress = achievement.progress + 1
      const unlocked = newProgress >= achievement.maxProgress
      
      return {
        ...achievement,
        progress: newProgress,
        unlocked,
        unlockedAt: unlocked ? new Date().toISOString() : undefined
      }
    }
    return achievement
  })
}

/**
 * Генерирует премиум награду с учетом supply usage
 */
export function generatePremiumReward(
  activity: string,
  points: number,
  userLevel: number,
  supplyPercentageUsed: number = 100
): PremiumReward {
  
  // Бонус для ранних пользователей
  const earlyAdopterBonus = Math.max(0, (100 - supplyPercentageUsed) / 10)
  const adjustedPoints = points + (points * earlyAdopterBonus / 100)
  
  // Определяем тип премиум награды на основе активности и поинтов
  let rewardType: PremiumReward['type'] = 'vip_access'
  
  if (adjustedPoints >= 1000) {
    rewardType = 'consultation' // Персональная консультация за джекпот
  } else if (adjustedPoints >= 500) {
    rewardType = 'custom_feature' // Кастомные функции
  } else if (userLevel >= 10) {
    rewardType = 'early_access' // Ранний доступ для высокоуровневых
  }
  
  const config = ALTERNATIVE_REWARDS_CONFIG.PREMIUM_REWARDS[rewardType.toUpperCase() as keyof typeof ALTERNATIVE_REWARDS_CONFIG.PREMIUM_REWARDS]
  
  // Увеличиваем длительность для ранних пользователей
  const bonusDuration = supplyPercentageUsed < 95 ? Math.floor(config.duration * 0.5) : 0
  
  return {
    id: `${rewardType}-${Date.now()}`,
    type: rewardType,
    name: config.name + (supplyPercentageUsed < 95 ? " (Early Adopter)" : ""),
    description: `Earned ${config.name} through ${activity}. Supply used: ${supplyPercentageUsed.toFixed(1)}%`,
    duration: config.duration + bonusDuration,
    features: getPremiumFeatures(rewardType)
  }
}

/**
 * Возвращает список функций для премиум награды
 */
function getPremiumFeatures(type: PremiumReward['type']): string[] {
  const features: Record<PremiumReward['type'], string[]> = {
    'vip_access': [
      'Access to VIP Discord channel',
      'Exclusive weekly content',
      'Priority customer support',
      'Special VIP badge'
    ],
    'early_access': [
      'Beta test new features',
      'Provide feedback to developers',
      'Access to development roadmap',
      'Early access badge'
    ],
    'consultation': [
      '1-on-1 mystical consultation',
      'Personalized reading',
      'Custom ritual recommendations',
      'Direct access to expert'
    ],
    'custom_feature': [
      'Personalized dashboard theme',
      'Custom ritual templates',
      'Advanced statistics',
      'Exclusive customization options'
    ]
  }
  
  return features[type] || []
}

/**
 * Проверяет, достигнут ли MAX_SUPPLY
 */
export async function isMaxSupplyReached(): Promise<boolean> {
  try {
    // Проверяем через API endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/web3/max-supply-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.maxSupplyReached || false
    }
    
    return false
  } catch (error) {
    console.error('Error checking MAX_SUPPLY:', error)
    return false
  }
}

/**
 * Минтит NFT награду через API
 */
async function mintNFTReward(nftReward: NFTReward, userWallet: string): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/web3/mint-nft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.INTERNAL_API_KEY || ''
      },
      body: JSON.stringify({
        nftReward,
        userWallet
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('[NFT] Successfully minted NFT:', data.tokenId)
      return true
    } else {
      const error = await response.json()
      console.error('[NFT] Failed to mint NFT:', error.error)
      return false
    }
  } catch (error) {
    console.error('[NFT] Error minting NFT:', error)
    return false
  }
}

/**
 * Сохраняет достижение в базу данных
 */
async function saveAchievement(userId: string, achievement: Achievement): Promise<boolean> {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("user_achievements")
      .upsert({
        user_id: userId,
        achievement_id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        tier: achievement.tier,
        progress: achievement.progress,
        max_progress: achievement.maxProgress,
        unlocked: achievement.unlocked,
        unlocked_at: achievement.unlockedAt
      })
    
    if (error) {
      console.error('[Achievement] Error saving achievement:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('[Achievement] Error saving achievement:', error)
    return false
  }
}

/**
 * Сохраняет премиум награду в базу данных
 */
async function savePremiumReward(userId: string, premiumReward: PremiumReward): Promise<boolean> {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    
    const expiresAt = premiumReward.duration 
      ? new Date(Date.now() + premiumReward.duration * 24 * 60 * 60 * 1000).toISOString()
      : null
    
    const { error } = await supabase
      .from("premium_rewards")
      .insert({
        user_id: userId,
        reward_id: premiumReward.id,
        type: premiumReward.type,
        name: premiumReward.name,
        description: premiumReward.description,
        duration: premiumReward.duration,
        features: premiumReward.features,
        expires_at: expiresAt
      })
    
    if (error) {
      console.error('[Premium] Error saving premium reward:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('[Premium] Error saving premium reward:', error)
    return false
  }
}

/**
 * Основная функция для выдачи альтернативной награды
 */
export async function awardAlternativeReward(
  userId: string,
  walletAddress: string,
  activity: string,
  points: number,
  userLevel: number,
  streakBonus: number = 0,
  supplyPercentageUsed: number = 100
): Promise<{
  type: 'nft' | 'achievement' | 'premium'
  reward: NFTReward | Achievement | PremiumReward
  message: string
  success: boolean
  earlyAdopterBonus?: number
}> {
  
  const earlyAdopterBonus = Math.max(0, (100 - supplyPercentageUsed) / 10)
  const rewardType = determineAlternativeReward(activity, points, userLevel, streakBonus, supplyPercentageUsed)
  
  switch (rewardType) {
    case 'nft':
      const nftReward = generateNFTReward(activity, points, walletAddress, supplyPercentageUsed)
      const nftMinted = await mintNFTReward(nftReward, walletAddress)
      
      const nftMessage = supplyPercentageUsed < 95 
        ? `🎨 Earned ${nftReward.rarity} NFT: ${nftReward.name}! (Early Adopter Bonus: +${earlyAdopterBonus.toFixed(1)}%)`
        : `🎨 Earned ${nftReward.rarity} NFT: ${nftReward.name}!`
      
      return {
        type: 'nft',
        reward: nftReward,
        message: nftMessage,
        success: nftMinted,
        earlyAdopterBonus
      }
      
    case 'premium':
      const premiumReward = generatePremiumReward(activity, points, userLevel, supplyPercentageUsed)
      const premiumSaved = await savePremiumReward(userId, premiumReward)
      
      const premiumMessage = supplyPercentageUsed < 95
        ? `🌟 Unlocked premium feature: ${premiumReward.name}! (Early Adopter Bonus: +${earlyAdopterBonus.toFixed(1)}%)`
        : `🌟 Unlocked premium feature: ${premiumReward.name}!`
      
      return {
        type: 'premium',
        reward: premiumReward,
        message: premiumMessage,
        success: premiumSaved,
        earlyAdopterBonus
      }
      
    case 'achievement':
    default:
      // Получаем текущие достижения пользователя из БД
      const currentAchievements = await getUserAchievements(userId)
      const updatedAchievements = updateAchievementProgress(userId, activity, currentAchievements)
      
      // Находим обновленное достижение
      const updatedAchievement = updatedAchievements.find(a => 
        currentAchievements.find(ca => ca.id === a.id && ca.progress !== a.progress)
      ) || currentAchievements[0] || {
        id: 'RITUAL_MASTER',
        name: 'Ritual Master',
        description: 'Complete daily rituals',
        icon: '🔮',
        tier: 1,
        progress: 1,
        maxProgress: 100,
        unlocked: false
      }
      
      const achievementSaved = await saveAchievement(userId, updatedAchievement)
      
      const achievementMessage = supplyPercentageUsed < 95
        ? `🏆 Achievement progress: ${updatedAchievement.name} (${updatedAchievement.progress}/${updatedAchievement.maxProgress}) (Early Adopter Bonus: +${earlyAdopterBonus.toFixed(1)}%)`
        : `🏆 Achievement progress: ${updatedAchievement.name} (${updatedAchievement.progress}/${updatedAchievement.maxProgress})`
      
      return {
        type: 'achievement',
        reward: updatedAchievement,
        message: achievementMessage,
        success: achievementSaved,
        earlyAdopterBonus
      }
  }
}

/**
 * Получает текущие достижения пользователя из базы данных
 */
async function getUserAchievements(userId: string): Promise<Achievement[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    
    const { data: achievements, error } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", userId)
    
    if (error) {
      console.error('[Achievement] Error fetching achievements:', error)
      return getDefaultAchievements()
    }
    
    if (!achievements || achievements.length === 0) {
      // Создаем начальные достижения для пользователя
      const defaultAchievements = getDefaultAchievements()
      
      for (const achievement of defaultAchievements) {
        await supabase.from("user_achievements").insert({
          user_id: userId,
          achievement_id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          tier: achievement.tier,
          progress: achievement.progress,
          max_progress: achievement.maxProgress,
          unlocked: achievement.unlocked
        })
      }
      
      return defaultAchievements
    }
    
    return achievements.map(a => ({
      id: a.achievement_id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      tier: a.tier,
      progress: a.progress,
      maxProgress: a.max_progress,
      unlocked: a.unlocked,
      unlockedAt: a.unlocked_at
    }))
    
  } catch (error) {
    console.error('[Achievement] Error getting user achievements:', error)
    return getDefaultAchievements()
  }
}

/**
 * Возвращает набор достижений по умолчанию
 */
function getDefaultAchievements(): Achievement[] {
  return [
    {
      id: 'RITUAL_MASTER',
      name: 'Ritual Master',
      description: 'Complete daily rituals',
      icon: '🔮',
      tier: 1,
      progress: 0,
      maxProgress: 100,
      unlocked: false
    },
    {
      id: 'FORTUNE_SEEKER',
      name: 'Fortune Seeker',
      description: 'Spin the wheel of fortune',
      icon: '🎰',
      tier: 1,
      progress: 0,
      maxProgress: 1000,
      unlocked: false
    },
    {
      id: 'SOCIAL_BUTTERFLY',
      name: 'Social Butterfly',
      description: 'Complete social media tasks',
      icon: '🦋',
      tier: 1,
      progress: 0,
      maxProgress: 50,
      unlocked: false
    },
    {
      id: 'STREAK_CHAMPION',
      name: 'Streak Champion',
      description: 'Maintain daily activity streaks',
      icon: '🔥',
      tier: 1,
      progress: 0,
      maxProgress: 365,
      unlocked: false
    }
  ]
}