/**
 * Validation utilities for anti-abuse measures
 */

/**
 * Validates if a string is a valid Ethereum address
 */
export function isValidEvmAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false
  }
  
  // Check if it starts with 0x and has 42 characters total
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/
  return ethAddressRegex.test(address)
}

/**
 * Normalizes an Ethereum address to lowercase
 */
export function normalizeAddress(address: string): string {
  if (!isValidEvmAddress(address)) {
    throw new Error('Invalid Ethereum address')
  }
  return address.toLowerCase()
}

/**
 * Validates if a string is a valid Twitter URL
 */
export function isValidTwitterUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }
  
  const twitterUrlRegex = /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/
  return twitterUrlRegex.test(url)
}

/**
 * Validates if a string is a valid tweet ID
 */
export function isValidTweetId(tweetId: string): boolean {
  if (!tweetId || typeof tweetId !== 'string') {
    return false
  }
  
  // Tweet IDs are numeric strings
  const tweetIdRegex = /^\d+$/
  return tweetIdRegex.test(tweetId)
}

/**
 * Extracts tweet ID from Twitter URL
 */
export function extractTweetId(url: string): string | null {
  if (!isValidTwitterUrl(url)) {
    return null
  }
  
  const match = url.match(/\/status\/(\d+)/)
  return match ? match[1] : null
}

/**
 * Validates if a string contains only safe characters (prevents XSS)
 */
export function isSafeString(str: string, maxLength: number = 1000): boolean {
  if (!str || typeof str !== 'string') {
    return false
  }
  
  if (str.length > maxLength) {
    return false
  }
  
  // Allow alphanumeric, spaces, and common punctuation
  const safeStringRegex = /^[a-zA-Z0-9\s\.,!?;:'"()\-_@#$%&*+=\[\]{}|\\\/~`]*$/
  return safeStringRegex.test(str)
}

/**
 * Validates if a number is within a safe range
 */
export function isSafeNumber(num: number, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): boolean {
  if (typeof num !== 'number' || isNaN(num)) {
    return false
  }
  
  return num >= min && num <= max && Number.isFinite(num)
}

/**
 * Validates if a string is a valid referral code format
 */
export function isValidReferralCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false
  }
  
  // Referral codes are KC + 6 uppercase hex characters
  const referralCodeRegex = /^KC[A-F0-9]{6}$/
  return referralCodeRegex.test(code)
}