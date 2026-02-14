import { verifyMessage } from 'ethers'

/**
 * Проверяет подпись Web3 кошелька
 * 
 * @param walletAddress - Адрес кошелька
 * @param signature - Подпись сообщения
 * @param message - Исходное сообщение
 * @returns true если подпись валидна
 */
export async function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    // Восстанавливаем адрес из подписи
    const recoveredAddress = verifyMessage(message, signature)
    
    // Сравниваем адреса (case-insensitive)
    const isValid = recoveredAddress.toLowerCase() === walletAddress.toLowerCase()
    
    if (!isValid) {
      console.error('[WalletAuth] Signature verification failed:', {
        expected: walletAddress.toLowerCase(),
        recovered: recoveredAddress.toLowerCase(),
      })
    }
    
    return isValid
  } catch (error) {
    console.error('[WalletAuth] Signature verification error:', error)
    return false
  }
}

/**
 * Генерирует сообщение для подписи БЕЗ timestamp
 * Timestamp добавляется на frontend перед подписью
 * 
 * @param walletAddress - Адрес кошелька
 * @param nonce - Одноразовый код
 * @returns Форматированное сообщение для подписи
 */
export function generateAuthMessage(walletAddress: string, nonce: string): string {
  return `Welcome to Kabbalah Code Game!

Click "Sign" to authenticate your wallet.

Wallet: ${walletAddress}
Nonce: ${nonce}

This request will not trigger a blockchain transaction or cost any gas fees.`
}

/**
 * Генерирует случайный nonce
 */
export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

/**
 * Проверяет, что timestamp не слишком старый (защита от replay attacks)
 * 
 * @param timestamp - ISO timestamp строка
 * @param maxAgeMinutes - Максимальный возраст в минутах (по умолчанию 5)
 * @returns true если timestamp актуален
 */
export function isTimestampValid(timestamp: string, maxAgeMinutes: number = 5): boolean {
  try {
    const messageTime = new Date(timestamp).getTime()
    const now = Date.now()
    const maxAge = maxAgeMinutes * 60 * 1000 // в миллисекундах
    
    return (now - messageTime) <= maxAge
  } catch {
    return false
  }
}

/**
 * Извлекает nonce из подписанного сообщения
 */
export function extractNonceFromMessage(message: string): string | null {
  const match = message.match(/Nonce: ([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

/**
 * Извлекает timestamp из подписанного сообщения
 */
export function extractTimestampFromMessage(message: string): string | null {
  const match = message.match(/Timestamp: (.+)/)
  return match ? match[1].trim() : null
}