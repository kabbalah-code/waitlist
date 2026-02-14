/**
 * Referral system - KCODE rewards (5%-3%-1%)
 */

import { createClient } from "@/lib/supabase/server"
import { rewardUserWithKcode } from "@/lib/web3/backend-contracts"
import { KCODE_REWARDS } from "@/lib/points/calculator"

// Referral configuration
export const REFERRAL_CONFIG = {
  L1_PERCENT: KCODE_REWARDS.REFERRAL_L1_PERCENT,  // 5%
  L2_PERCENT: KCODE_REWARDS.REFERRAL_L2_PERCENT,  // 3%
  L3_PERCENT: KCODE_REWARDS.REFERRAL_L3_PERCENT,  // 1%
  // Total: 9%
  MAX_REFERRALS_PER_MONTH: 100,
  MAX_DAILY_REFERRAL_REWARDS: 10, // Max 10 KCODE per referrer per day
}

/**
 * Distribute referral rewards when a user earns KCODE
 * NOTE: This is called from backend after user earns KCODE
 * Smart contract also handles referral rewards automatically
 */
export async function distributeReferralRewards(
  userId: string,
  kcodeEarned: number,
  activityType: string
): Promise<void> {
  try {
    const supabase = await createClient()

    // Get user's referral info
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("referred_by_code, wallet_address")
      .eq("id", userId)
      .single()

    if (userError || !user || !user.referred_by_code) {
      // User wasn't referred by anyone, no rewards to distribute
      return
    }

    // Find the referrer chain (up to 3 levels)
    let currentReferralCode = user.referred_by_code
    const referrers = []
    
    for (let level = 1; level <= 3; level++) {
      if (!currentReferralCode) break
      
      const { data: referrer, error: referrerError } = await supabase
        .from("users")
        .select("id, wallet_address, total_kcode, tokens_minted, referral_code, referred_by_code")
        .eq("referral_code", currentReferralCode)
        .single()

      if (referrerError || !referrer) {
        console.warn(`[Referrals] Referrer not found for code: ${currentReferralCode}`)
        break
      }

      referrers.push({ ...referrer, level })
      currentReferralCode = referrer.referred_by_code
    }

    // Distribute rewards to each level
    for (const referrer of referrers) {
      let percentage = 0
      switch (referrer.level) {
        case 1: percentage = REFERRAL_CONFIG.L1_PERCENT; break
        case 2: percentage = REFERRAL_CONFIG.L2_PERCENT; break
        case 3: percentage = REFERRAL_CONFIG.L3_PERCENT; break
      }

      const referralReward = parseFloat((kcodeEarned * percentage / 100).toFixed(4))
      
      if (referralReward <= 0) continue

      // Check daily limit
      const today = new Date().toISOString().split('T')[0]
      const { data: todayRewards } = await supabase
        .from("kcode_transactions")
        .select("amount")
        .eq("user_id", referrer.id)
        .eq("type", "referral_reward")
        .gte("created_at", today + "T00:00:00Z")
        .lt("created_at", today + "T23:59:59Z")

      const todayTotal = todayRewards?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
      
      if (todayTotal + referralReward > REFERRAL_CONFIG.MAX_DAILY_REFERRAL_REWARDS) {
        console.log(`[Referrals] Daily limit reached for ${referrer.wallet_address}`)
        continue
      }

      // ✅ REWARD REFERRER WITH KCODE TOKENS ON-CHAIN!
      let txHash: string | undefined
      try {
        txHash = await rewardUserWithKcode(
          referrer.wallet_address,
          referralReward,
          `L${referrer.level} Referral: ${activityType}`
        )
        console.log(`[Referrals] ✅ L${referrer.level} reward: ${referralReward} KCODE to ${referrer.wallet_address.slice(0, 10)}... TX: ${txHash}`)
      } catch (contractError) {
        console.error(`[Referrals] Error rewarding referrer ${referrer.id}:`, contractError)
        continue
      }

      // Update referrer's total_kcode
      const newTotal = referrer.total_kcode + referralReward

      const { error: updateError } = await supabase
        .from("users")
        .update({
          total_kcode: newTotal,
          tokens_minted: referrer.tokens_minted + referralReward,
        })
        .eq("id", referrer.id)

      if (updateError) {
        console.error(`[Referrals] Failed to update referrer ${referrer.id}:`, updateError)
      }

      // Log the transaction
      await supabase
        .from("kcode_transactions")
        .insert({
          user_id: referrer.id,
          amount: referralReward,
          type: "referral_reward",
          description: `L${referrer.level} referral reward from ${activityType}`,
          tx_hash: txHash,
          metadata: {
            referred_user_id: userId,
            referred_user_wallet: user.wallet_address,
            activity_type: activityType,
            original_kcode: kcodeEarned,
            level: referrer.level,
            percentage: percentage
          }
        })
    }

  } catch (error) {
    console.error("[Referrals] Error distributing rewards:", error)
  }
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string) {
  try {
    const supabase = await createClient()

    // Get user's referral code
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("referral_code")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      throw new Error("User not found")
    }

    // Count level 1 referred users (direct referrals)
    const { count: level1Count, error: level1Error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("referred_by_code", user.referral_code)

    if (level1Error) {
      throw new Error("Error counting level 1 referrals")
    }

    // Get level 1 referrals to count their referrals (level 2)
    const { data: level1Users } = await supabase
      .from("users")
      .select("referral_code")
      .eq("referred_by_code", user.referral_code)

    let level2Count = 0
    let level3Count = 0

    if (level1Users && level1Users.length > 0) {
      const level1Codes = level1Users.map(u => u.referral_code)
      
      // Count level 2 referrals
      const { count: l2Count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .in("referred_by_code", level1Codes)

      level2Count = l2Count || 0

      // Get level 2 users to count level 3
      const { data: level2Users } = await supabase
        .from("users")
        .select("referral_code")
        .in("referred_by_code", level1Codes)

      if (level2Users && level2Users.length > 0) {
        const level2Codes = level2Users.map(u => u.referral_code)
        
        const { count: l3Count } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .in("referred_by_code", level2Codes)

        level3Count = l3Count || 0
      }
    }

    // Calculate total referral rewards earned (in KCODE)
    const { data: transactions, error: transactionsError } = await supabase
      .from("kcode_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "referral_reward")

    if (transactionsError) {
      throw new Error("Error fetching referral transactions")
    }

    const totalEarned = transactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0

    return {
      referralCode: user.referral_code,
      level1Count: level1Count || 0,
      level2Count,
      level3Count,
      totalReferred: (level1Count || 0) + level2Count + level3Count,
      totalEarned: parseFloat(totalEarned.toFixed(4)),
    }
  } catch (error) {
    console.error("[Referrals] Error getting referral stats:", error)
    throw error
  }
}

/**
 * Validate referral code
 */
export async function validateReferralCode(code: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("referral_code", code)
      .single()

    return !error && !!data
  } catch (error) {
    return false
  }
}

/**
 * Create referral relationship between users
 */
export async function createReferralRelationships(
  userId: string,
  referralCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Find the referrer by code
    const { data: referrer, error: referrerError } = await supabase
      .from("users")
      .select("id, wallet_address")
      .eq("referral_code", referralCode)
      .single()

    if (referrerError || !referrer) {
      return { success: false, error: "Invalid referral code" }
    }

    // Don't allow self-referral
    if (referrer.id === userId) {
      return { success: false, error: "Cannot refer yourself" }
    }

    // Update the user with referral information
    const { error: updateError } = await supabase
      .from("users")
      .update({ referred_by_code: referralCode })
      .eq("id", userId)

    if (updateError) {
      console.error("[Referrals] Error updating user:", updateError)
      return { success: false, error: "Failed to create referral relationship" }
    }

    console.log(`[Referrals] Created relationship: ${userId} referred by ${referrer.id}`)
    return { success: true }
  } catch (error) {
    console.error("[Referrals] Error creating relationship:", error)
    return { success: false, error: "Internal error" }
  }
}
