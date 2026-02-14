// KCODE Token Rewards System (NO POINTS - ONLY TOKENS!)

export const KCODE_REWARDS = {
  // Daily rewards (in KCODE tokens)
  DAILY_RITUAL: 1, // 1 KCODE
  WHEEL_SPIN_MIN: 0.1, // 0.1 KCODE
  WHEEL_SPIN_MAX: 1.5, // 1.5 KCODE

  // Streak bonuses (in KCODE tokens)
  STREAK_7_DAYS: 0.5, // 0.5 KCODE
  STREAK_14_DAYS: 1, // 1 KCODE
  STREAK_30_DAYS: 2, // 2 KCODE

  // One-time tasks (in KCODE tokens)
  JOIN_TELEGRAM_GROUP: 0.5, // 0.5 KCODE
  JOIN_TELEGRAM_CHAT: 0.5, // 0.5 KCODE
  FOLLOW_TWITTER: 10, // 10 KCODE
  CONNECT_TELEGRAM: 10, // 10 KCODE
  CONNECT_DISCORD: 10, // 10 KCODE
  LIKE_TWEET: 0.25, // 0.25 KCODE
  RETWEET_TWEET: 0.75, // 0.75 KCODE

  // Referral percentages (UPDATED: 5%-3%-1%)
  REFERRAL_L1_PERCENT: 5,  // 5% (was 15%)
  REFERRAL_L2_PERCENT: 3,  // 3% (was 7%)
  REFERRAL_L3_PERCENT: 1,  // 1% (was 3%)

  // Wheel spin cost (in KCODE tokens)
  EXTRA_SPIN_COST: 1, // 1 KCODE for extra spin
}

// Backward compatibility alias
export const POINTS_CONFIG = KCODE_REWARDS

export const WHEEL_REWARDS = [
  { type: "kcode", value: 0.1, label: "0.1 KCODE", probability: 0.25, color: "#333" },
  { type: "kcode", value: 0.25, label: "0.25 KCODE", probability: 0.25, color: "#444" },
  { type: "multiplier", value: 2, label: "x2 Next", probability: 0.15, color: "#FF9500" },
  { type: "kcode", value: 0.5, label: "0.5 KCODE", probability: 0.14, color: "#555" },
  { type: "kcode", value: 0.75, label: "0.75 KCODE", probability: 0.1, color: "#666" },
  { type: "kcode", value: 1.5, label: "1.5 KCODE", probability: 0.05, color: "#FFB340" },
  { type: "pol", value: 0.1, label: "0.1 POL", probability: 0.05, color: "#8247E5" }, // Минимальный шанс POL
  { type: "pol", value: 1, label: "1 POL!", probability: 0.005, color: "#9D5CFF" }, // Почти нереальный шанс
  { type: "jackpot", value: 5, label: "5 KCODE!", probability: 0.005, color: "#FFD700" }, // Уменьшен шанс джекпота
]

export function spinWheel(): (typeof WHEEL_REWARDS)[number] {
  const random = Math.random()
  let cumulative = 0

  for (const reward of WHEEL_REWARDS) {
    cumulative += reward.probability
    if (random <= cumulative) {
      return reward
    }
  }

  return WHEEL_REWARDS[0]
}

export function calculateStreakBonus(streak: number): number {
  if (streak >= 30) return KCODE_REWARDS.STREAK_30_DAYS
  if (streak >= 14) return KCODE_REWARDS.STREAK_14_DAYS
  if (streak >= 7) return KCODE_REWARDS.STREAK_7_DAYS
  return 0
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

export function getNextLevelKcode(currentLevel: number): number {
  const nextLevel = currentLevel + 1
  return getKcodeForLevel(nextLevel)
}

export function calculateReferralReward(earnedKcode: number, level: 1 | 2 | 3): number {
  const percentages = {
    1: KCODE_REWARDS.REFERRAL_L1_PERCENT,
    2: KCODE_REWARDS.REFERRAL_L2_PERCENT,
    3: KCODE_REWARDS.REFERRAL_L3_PERCENT,
  }

  return parseFloat((earnedKcode * (percentages[level] / 100)).toFixed(4))
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
