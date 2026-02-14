// Telegram Bot integration for user verification
// Users send /verify {walletCode} to bot, bot calls our API

export interface TelegramUser {
  id: number
  username?: string
  first_name: string
  last_name?: string
}

export interface TelegramMessage {
  message_id: number
  from: TelegramUser
  chat: {
    id: number
    type: string
  }
  text: string
  date: number
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

// Verify wallet code format
export function isValidWalletCode(code: string): boolean {
  return /^[a-f0-9]{6}$/.test(code.toLowerCase())
}

// Extract wallet code from /verify command
export function extractWalletCode(text: string): string | null {
  const match = text.match(/^\/verify\s+([a-f0-9]{6})$/i)
  return match ? match[1].toLowerCase() : null
}

// Generate verification message for user
export function generateVerificationMessage(username: string, points: number): string {
  return `✅ Verification successful!

Welcome to KabbalahCode, @${username}!
You've earned ${points} points for connecting Telegram.

🔮 Continue your mystical journey at kabbalahcode.com`
}

// Generate error message
export function generateErrorMessage(error: string): string {
  return `❌ Verification failed: ${error}

Usage: /verify {your6digitcode}
Get your code from kabbalahcode.com/dashboard`
}

// Send message via Telegram Bot API
export async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  
  if (!botToken) {
    console.error('[Telegram] Bot token not configured')
    return false
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })

    const data = await response.json()
    return data.ok
  } catch (error) {
    console.error('[Telegram] Send message error:', error)
    return false
  }
}

// Process incoming webhook update
export async function processTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message
  
  if (!message || !message.text || !message.from) {
    return
  }

  // Only process /verify commands
  if (!message.text.startsWith('/verify')) {
    return
  }

  const chatId = message.chat.id
  const telegramUser = message.from
  const walletCode = extractWalletCode(message.text)

  if (!walletCode) {
    await sendTelegramMessage(
      chatId,
      generateErrorMessage('Invalid wallet code format. Use 6 hex characters.')
    )
    return
  }

  try {
    // Call our internal API to verify and link account
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/telegram/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({
        walletCode,
        telegramUser: {
          id: telegramUser.id,
          username: telegramUser.username,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
        },
      }),
    })

    const data = await response.json()

    if (data.success) {
      await sendTelegramMessage(
        chatId,
        generateVerificationMessage(
          telegramUser.username || telegramUser.first_name,
          data.points || 75
        )
      )
    } else {
      await sendTelegramMessage(
        chatId,
        generateErrorMessage(data.error || 'Verification failed')
      )
    }
  } catch (error) {
    console.error('[Telegram] Verification error:', error)
    await sendTelegramMessage(
      chatId,
      generateErrorMessage('Internal error. Please try again later.')
    )
  }
}