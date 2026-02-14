// Telegram Bot API wrapper for verification

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramMessage {
  message_id: number
  from: TelegramUser
  date: number
  text?: string
  chat: {
    id: number
    type: string
  }
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

export class TelegramBotAPI {
  private botToken: string
  private baseUrl: string

  constructor(botToken: string) {
    this.botToken = botToken
    this.baseUrl = `https://api.telegram.org/bot${botToken}`
  }

  // Get bot info
  async getMe(): Promise<TelegramUser | null> {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`)
      const data = await response.json()
      
      if (data.ok) {
        return data.result
      }
      
      console.error('[Telegram Bot] getMe failed:', data)
      return null
    } catch (error) {
      console.error('[Telegram Bot] getMe error:', error)
      return null
    }
  }

  // Get updates (messages)
  async getUpdates(offset?: number, limit: number = 100): Promise<TelegramUpdate[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        timeout: '10'
      })
      
      if (offset) {
        params.append('offset', offset.toString())
      }

      const response = await fetch(`${this.baseUrl}/getUpdates?${params}`)
      const data = await response.json()
      
      if (data.ok) {
        return data.result
      }
      
      console.error('[Telegram Bot] getUpdates failed:', data)
      return []
    } catch (error) {
      console.error('[Telegram Bot] getUpdates error:', error)
      return []
    }
  }

  // Send message to user
  async sendMessage(chatId: number, text: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      })
      
      const data = await response.json()
      return data.ok
    } catch (error) {
      console.error('[Telegram Bot] sendMessage error:', error)
      return false
    }
  }

  // Find user by username in recent messages
  async findUserByUsername(username: string): Promise<TelegramUser | null> {
    try {
      const updates = await this.getUpdates()
      
      // Look for messages from this username
      for (const update of updates) {
        if (update.message?.from?.username === username) {
          return update.message.from
        }
      }
      
      return null
    } catch (error) {
      console.error('[Telegram Bot] findUserByUsername error:', error)
      return null
    }
  }

  // Check if user sent specific message
  async checkUserMessage(username: string, messageText: string, timeWindow: number = 300): Promise<boolean> {
    try {
      const updates = await this.getUpdates()
      const now = Math.floor(Date.now() / 1000)
      
      // Look for messages from this username containing the text
      for (const update of updates) {
        const message = update.message
        if (
          message?.from?.username === username &&
          message.text?.includes(messageText) &&
          (now - message.date) <= timeWindow // Within time window (5 minutes default)
        ) {
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('[Telegram Bot] checkUserMessage error:', error)
      return false
    }
  }

  // Get user info by username (from recent activity)
  async getUserInfo(username: string): Promise<TelegramUser | null> {
    try {
      const updates = await this.getUpdates()
      
      // Find most recent message from this user
      for (const update of updates.reverse()) {
        if (update.message?.from?.username === username) {
          return update.message.from
        }
      }
      
      return null
    } catch (error) {
      console.error('[Telegram Bot] getUserInfo error:', error)
      return null
    }
  }
}

// Create bot instance
export function createTelegramBot(): TelegramBotAPI | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  
  if (!botToken) {
    console.error('[Telegram Bot] Bot token not configured')
    return null
  }
  
  return new TelegramBotAPI(botToken)
}