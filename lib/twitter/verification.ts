// Twitter verification via oEmbed and Syndication APIs (no OAuth required)

export interface TweetData {
  authorUsername: string
  authorName: string
  tweetId: string
  tweetText: string
  createdAt: string
}

// Extract tweet ID from various Twitter/X URL formats
export function extractTweetId(url: string): string | null {
  const patterns = [
    /twitter\.com\/\w+\/status\/(\d+)/,
    /x\.com\/\w+\/status\/(\d+)/,
    /mobile\.twitter\.com\/\w+\/status\/(\d+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

// Extract username from URL
export function extractUsernameFromUrl(url: string): string | null {
  const patterns = [/twitter\.com\/(@?\w+)\/status/, /x\.com\/(@?\w+)\/status/]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1].replace("@", "")
  }

  return null
}

// Generate unique verification code based on wallet and timestamp
export function generateVerificationCode(walletAddress: string): string {
  const timestamp = Math.floor(Date.now() / 1000 / 3600) // Hour-based
  const hash = simpleHash(walletAddress + timestamp.toString())
  return `KC-${hash.slice(0, 6).toUpperCase()}`
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

// Verify tweet via oEmbed API (server-side)
export async function verifyTweetOEmbed(tweetUrl: string): Promise<{
  success: boolean
  data?: {
    authorName: string
    html: string
  }
  error?: string
}> {
  try {
    const encodedUrl = encodeURIComponent(tweetUrl)
    const response = await fetch(`https://publish.twitter.com/oembed?url=${encodedUrl}&omit_script=true`, {
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      return { success: false, error: "Tweet not found or is private" }
    }

    const data = await response.json()

    return {
      success: true,
      data: {
        authorName: data.author_name,
        html: data.html,
      },
    }
  } catch (error) {
    return { success: false, error: "Failed to verify tweet" }
  }
}

// Parse username from oEmbed HTML
export function parseUsernameFromOEmbed(html: string): string | null {
  // oEmbed HTML contains: href="https://twitter.com/username?ref_src=..."
  const match = html.match(/twitter\.com\/(\w+)\?ref_src/)
  return match ? match[1] : null
}

// Check if tweet contains required verification code
export function tweetContainsCode(html: string, code: string): boolean {
  return html.toLowerCase().includes(code.toLowerCase())
}

// Check if tweet contains required hashtag
export function tweetContainsHashtag(html: string, hashtag: string): boolean {
  const normalizedHashtag = hashtag.startsWith("#") ? hashtag.slice(1) : hashtag
  return html.toLowerCase().includes(`#${normalizedHashtag.toLowerCase()}`)
}

// Generate Twitter intent URL for pre-filled tweet
export function generateTwitterIntent(params: {
  text: string
  hashtags?: string[]
  url?: string
}): string {
  const baseUrl = "https://twitter.com/intent/tweet"
  const searchParams = new URLSearchParams()

  searchParams.set("text", params.text)

  if (params.hashtags?.length) {
    searchParams.set("hashtags", params.hashtags.join(","))
  }

  if (params.url) {
    searchParams.set("url", params.url)
  }

  return `${baseUrl}?${searchParams.toString()}`
}
