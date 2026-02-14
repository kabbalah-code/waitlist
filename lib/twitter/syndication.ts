// Twitter Syndication API - gets actual tweet content without OAuth

export interface SyndicationTweet {
  id_str: string
  text: string
  user: {
    screen_name: string
    name: string
    profile_image_url_https: string
  }
  created_at: string
}

// Fetch tweet via Syndication API (returns actual text)
export async function fetchTweetSyndication(tweetId: string): Promise<SyndicationTweet | null> {
  try {
    const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=0`
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KabbalahCode/1.0)",
      },
    })

    if (!res.ok) return null

    const data = await res.json()

    // Syndication API returns tweet data directly
    return {
      id_str: data.id_str || tweetId,
      text: data.text || "",
      user: {
        screen_name: data.user?.screen_name || "",
        name: data.user?.name || "",
        profile_image_url_https: data.user?.profile_image_url_https || "",
      },
      created_at: data.created_at || "",
    }
  } catch (error) {
    console.error("[Twitter] Syndication fetch error:", error)
    return null
  }
}

// Verify tweet age (must be recent)
export function verifyTweetAge(createdAt: string): { valid: boolean; error?: string } {
  if (!createdAt) {
    return { valid: false, error: "Could not determine tweet age" }
  }

  try {
    console.log("[Twitter] Verifying tweet age, createdAt:", createdAt)
    
    // Twitter Syndication API returns date in format: "Mon Jan 01 12:00:00 +0000 2026"
    // We need to parse it correctly
    const tweetDate = new Date(createdAt)
    
    if (isNaN(tweetDate.getTime())) {
      console.error("[Twitter] Invalid date format:", createdAt)
      return { valid: false, error: "Invalid tweet date format" }
    }
    
    const now = new Date()
    const hoursDiff = (now.getTime() - tweetDate.getTime()) / (1000 * 60 * 60)

    console.log("[Twitter] Tweet age check:", {
      tweetDate: tweetDate.toISOString(),
      now: now.toISOString(),
      hoursDiff: hoursDiff.toFixed(2)
    })

    // Tweet must be less than 24 hours old
    if (hoursDiff > 24) {
      return { valid: false, error: "Tweet must be posted within the last 24 hours" }
    }

    // Tweet cannot be from the future (allow 5 minutes tolerance for clock skew)
    if (hoursDiff < -0.083) { // -5 minutes
      console.error("[Twitter] Tweet from future:", { hoursDiff, tweetDate, now })
      return { valid: false, error: "Invalid tweet timestamp" }
    }

    return { valid: true }
  } catch (error) {
    console.error("[Twitter] Error verifying tweet age:", error)
    return { valid: false, error: "Invalid tweet date format" }
  }
}

export function verifyTweetContent(
  text: string, 
  walletAddress: string,
  tweetAuthor: string,
  expectedUsername?: string
): { valid: boolean; error?: string } {
  const normalizedText = text.toLowerCase()

  // КРИТИЧНО: Если у пользователя уже есть привязанный Twitter, проверяем что это его твит
  if (expectedUsername) {
    const normalizedAuthor = tweetAuthor.toLowerCase()
    const normalizedExpected = expectedUsername.toLowerCase()
    
    if (normalizedAuthor !== normalizedExpected) {
      return { 
        valid: false, 
        error: `This tweet is from @${tweetAuthor}, but your account is linked to @${expectedUsername}. Please tweet from your verified account.` 
      }
    }
  }

  // Tweet должен содержать #kabbalahcode
  if (!normalizedText.includes("#kabbalahcode")) {
    return { valid: false, error: "Tweet must contain #KabbalahCode hashtag" }
  }

  return { valid: true }
}

// Упрощенная версия для ритуала - только хештег и вхождение текста
export function verifyRitualTweetContent(
  text: string,
  predictionMessage: string,
  tweetAuthor: string,
  expectedUsername?: string
): { valid: boolean; error?: string } {
  const normalizedText = text.toLowerCase()
  const normalizedPrediction = predictionMessage.toLowerCase()

  // 🔒 КРИТИЧНО: Если у пользователя есть привязанный Twitter, проверяем что это его твит
  if (expectedUsername) {
    const normalizedAuthor = tweetAuthor.toLowerCase()
    const normalizedExpected = expectedUsername.toLowerCase()
    
    if (normalizedAuthor !== normalizedExpected) {
      return { 
        valid: false, 
        error: `This tweet is from @${tweetAuthor}, but your account is linked to @${expectedUsername}. Please tweet from your verified account.` 
      }
    }
  }

  // Tweet должен содержать #kabbalahcode
  if (!normalizedText.includes("#kabbalahcode")) {
    return { valid: false, error: "Tweet must contain #KabbalahCode hashtag" }
  }

  // Tweet должен содержать часть текста предсказания (минимум 10 символов)
  if (predictionMessage.length >= 10) {
    const predictionWords = normalizedPrediction.split(' ').filter(word => word.length > 3)
    const foundWords = predictionWords.filter(word => normalizedText.includes(word))
    
    if (foundWords.length === 0) {
      return { valid: false, error: "Tweet must contain part of your prediction text" }
    }
  }

  return { valid: true }
}

export async function verifyTweetViaSyndication(
  tweetUrl: string,
  walletId: string,
): Promise<{ valid: boolean; username?: string; error?: string }> {
  try {
    // Extract tweet ID from URL
    // Formats: twitter.com/user/status/123, x.com/user/status/123
    const match = tweetUrl.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
    if (!match) {
      return { valid: false, error: "Invalid tweet URL" }
    }

    const tweetId = match[1]
    const tweet = await fetchTweetSyndication(tweetId)

    if (!tweet) {
      return { valid: false, error: "Could not fetch tweet. Make sure the tweet is public." }
    }

    const text = tweet.text.toLowerCase()

    // Check for hashtag
    if (!text.includes("#kabbalahcode")) {
      return { valid: false, error: "Tweet must include #KabbalahCode hashtag" }
    }

    // Check for wallet identifier
    if (!text.includes(walletId.toLowerCase())) {
      return { valid: false, error: `Tweet must include your wallet ID: ${walletId}` }
    }

    return {
      valid: true,
      username: tweet.user.screen_name,
    }
  } catch (error) {
    console.error("[v0] Tweet verification error:", error)
    return { valid: false, error: "Verification failed. Please try again." }
  }
}
