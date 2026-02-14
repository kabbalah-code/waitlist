// Achievement System - автоматическая проверка и начисление достижений
import { createClient } from "@/lib/supabase/server"

interface AchievementCriteria {
  type: string
  [key: string]: unknown
}

/**
 * Check and award achievements for a user
 */
export async function checkAndAwardAchievements(
  userId: string,
  triggerType: string,
  triggerData?: Record<string, unknown>,
): Promise<string[]> {
  const supabase = await createClient()
  const awardedAchievements: string[] = []

  // Get all achievements
  const { data: allAchievements, error: achievementsError } = await supabase
    .from("achievements")
    .select("*")

  if (achievementsError || !allAchievements) {
    console.error("[Achievements] Error fetching achievements:", achievementsError)
    return awardedAchievements
  }

  // Get user's already earned achievements
  const { data: earned, error: earnedError } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)

  if (earnedError) {
    console.error("[Achievements] Error fetching earned achievements:", earnedError)
    return awardedAchievements
  }

  const earnedIds = new Set(earned?.map((e) => e.achievement_id) || [])

  // Get user data for checking criteria
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single()

  if (userError || !user) {
    console.error("[Achievements] Error fetching user:", userError)
    return awardedAchievements
  }

  // Check each achievement
  for (const achievement of allAchievements) {
    // Skip if already earned
    if (earnedIds.has(achievement.id)) continue

    const criteria = achievement.criteria as AchievementCriteria

    // Check if achievement matches trigger type
    if (criteria.type !== triggerType && triggerType !== "manual_check") continue

    let shouldAward = false

    // Check different achievement types
    switch (criteria.type) {
      case "onboarding":
        // Check if all onboarding tasks completed
        const { count: tasksCount } = await supabase
          .from("tasks_completion")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
        shouldAward = (tasksCount || 0) >= 5
        break

      case "streak":
        const requiredDays = (criteria.days as number) || 0
        shouldAward = user.current_streak >= requiredDays
        break

      case "twitter_connect":
        shouldAward = Boolean(user.twitter_username && user.twitter_verified_at)
        break

      case "referrals":
        const requiredCount = (criteria.count as number) || 0
        const { count: referralsCount } = await supabase
          .from("referrals")
          .select("*", { count: "exact", head: true })
          .eq("referrer_id", userId)
          .eq("level", 1)
        shouldAward = (referralsCount || 0) >= requiredCount
        break

      case "rituals":
        const requiredRituals = (criteria.count as number) || 0
        const { count: ritualsCount } = await supabase
          .from("daily_rituals")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
        shouldAward = (ritualsCount || 0) >= requiredRituals
        break

      case "points":
        const requiredPoints = (criteria.amount as number) || 0
        shouldAward = user.total_points >= requiredPoints
        break

      case "sephirot":
        const requiredSephirot = (criteria.count as number) || 0
        const { count: sephirotCount } = await supabase
          .from("user_sephirot")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
        shouldAward = (sephirotCount || 0) >= requiredSephirot
        break

      case "level":
        const requiredLevel = (criteria.level as number) || 0
        shouldAward = user.level >= requiredLevel
        break
    }

    if (shouldAward) {
      // Award achievement
      const { error: awardError } = await supabase.from("user_achievements").insert({
        user_id: userId,
        achievement_id: achievement.id,
      })

      if (awardError) {
        console.error(`[Achievements] Error awarding ${achievement.code}:`, awardError)
        continue
      }

      // Award points
      if (achievement.points_reward > 0) {
        const { error: pointsError } = await supabase
          .from("users")
          .update({
            total_points: user.total_points + achievement.points_reward,
            available_points: user.available_points + achievement.points_reward,
          })
          .eq("id", userId)

        if (pointsError) {
          console.error(`[Achievements] Error updating points for ${achievement.code}:`, pointsError)
        }

        // Record transaction
        await supabase.from("points_transactions").insert({
          user_id: userId,
          amount: achievement.points_reward,
          type: "achievement",
          description: `Achievement: ${achievement.name}`,
          metadata: {
            achievement_id: achievement.id,
            achievement_code: achievement.code,
          },
        })
      }

      awardedAchievements.push(achievement.code)
      console.log(`[Achievements] Awarded ${achievement.code} to user ${userId}`)
    }
  }

  return awardedAchievements
}

/**
 * Get user's achievements
 */
export async function getUserAchievements(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_achievements")
    .select(
      `
      *,
      achievement:achievements(*)
    `,
    )
    .eq("user_id", userId)
    .order("earned_at", { ascending: false })

  if (error) {
    console.error("[Achievements] Error fetching user achievements:", error)
    return []
  }

  return data || []
}

/**
 * Get all available achievements with user's status
 */
export async function getAllAchievementsWithStatus(userId: string) {
  const supabase = await createClient()

  // Get all achievements
  const { data: allAchievements, error: achievementsError } = await supabase
    .from("achievements")
    .select("*")
    .order("points_reward", { ascending: false })

  if (achievementsError || !allAchievements) {
    console.error("[Achievements] Error fetching achievements:", achievementsError)
    return []
  }

  // Get user's earned achievements
  const { data: earned, error: earnedError } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)

  if (earnedError) {
    console.error("[Achievements] Error fetching earned achievements:", earnedError)
    return []
  }

  const earnedIds = new Set(earned?.map((e) => e.achievement_id) || [])

  return allAchievements.map((achievement) => ({
    ...achievement,
    isEarned: earnedIds.has(achievement.id),
  }))
}


