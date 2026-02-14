"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Twitter, MessageCircle, Hash, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface SocialAccount {
  platform: 'twitter' | 'telegram' | 'discord'
  username: string
  verified: boolean
  verifiedAt?: string
  points?: number
}

interface SocialAccountsProps {
  walletAddress: string
  onAccountVerified: (platform: string, points: number) => void
}

export function SocialAccounts({ walletAddress, onAccountVerified }: SocialAccountsProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [inputs, setInputs] = useState<{ [key: string]: string }>({})
  const [verificationCodes, setVerificationCodes] = useState<{ [key: string]: string }>({})
  const [step, setStep] = useState<{ [key: string]: 'input' | 'verify' | 'verified' }>({})

  // Загружаем привязанные аккаунты
  useEffect(() => {
    loadSocialAccounts()
  }, [walletAddress])

  const loadSocialAccounts = async () => {
    try {
      const response = await fetch('/api/social/accounts', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAccounts(data.accounts || [])
          
          // Устанавливаем статус для каждой платформы
          const newStep: { [key: string]: 'input' | 'verify' | 'verified' } = {}
          data.accounts?.forEach((account: SocialAccount) => {
            newStep[account.platform] = account.verified ? 'verified' : 'input'
          })
          setStep(newStep)
        }
      }
    } catch (error) {
      console.error('[Social] Error loading accounts:', error)
    }
  }

  const generateVerificationCode = (platform: string): string => {
    const codes = {
      twitter: `🎯 Verifying my wallet ${walletAddress.slice(0, 8)}... for @KabbalhCode #Web3Game #KCODE`,
      telegram: `🔮 Kabbalah Code verification: ${walletAddress.slice(0, 8)}...`,
      discord: `⚡ Verifying wallet ${walletAddress.slice(0, 8)}... for Kabbalah Code Game`
    }
    return codes[platform as keyof typeof codes] || `Verification: ${walletAddress.slice(0, 8)}...`
  }

  const startVerification = async (platform: 'twitter' | 'telegram' | 'discord') => {
    const username = inputs[platform]?.trim()
    if (!username) return

    setLoading({ ...loading, [platform]: true })

    try {
      // Генерируем код верификации
      const code = generateVerificationCode(platform)
      setVerificationCodes({ ...verificationCodes, [platform]: code })
      
      // Отправляем запрос на начало верификации
      const response = await fetch('/api/social/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform,
          username,
          verificationCode: code
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setStep({ ...step, [platform]: 'verify' })
      } else {
        alert(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      console.error(`[Social] Error starting ${platform} verification:`, error)
      alert('Ошибка при запуске верификации')
    } finally {
      setLoading({ ...loading, [platform]: false })
    }
  }

  const completeVerification = async (platform: 'twitter' | 'telegram' | 'discord') => {
    setLoading({ ...loading, [platform]: true })

    try {
      const response = await fetch('/api/social/verify/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform,
          username: inputs[platform]
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setStep({ ...step, [platform]: 'verified' })
        
        // Обновляем список аккаунтов
        const newAccount: SocialAccount = {
          platform,
          username: inputs[platform],
          verified: true,
          verifiedAt: new Date().toISOString(),
          points: data.pointsAwarded || 0
        }
        
        setAccounts(prev => [...prev.filter(a => a.platform !== platform), newAccount])
        
        // Уведомляем родительский компонент
        onAccountVerified(platform, data.pointsAwarded || 0)
        
        alert(`✅ ${platform.charAt(0).toUpperCase() + platform.slice(1)} успешно привязан! Получено ${data.pointsAwarded || 0} очков.`)
      } else {
        alert(`Ошибка верификации: ${data.error}`)
      }
    } catch (error) {
      console.error(`[Social] Error completing ${platform} verification:`, error)
      alert('Ошибка при завершении верификации')
    } finally {
      setLoading({ ...loading, [platform]: false })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Скопировано в буфер обмена!')
  }

  const platformConfig = {
    twitter: {
      name: 'Twitter',
      icon: Twitter,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      placeholder: '@username',
      instructions: 'Опубликуйте твит с кодом верификации',
      points: 100
    },
    telegram: {
      name: 'Telegram',
      icon: MessageCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-600/10',
      borderColor: 'border-blue-600/30',
      placeholder: '@username',
      instructions: 'Отправьте сообщение в любой публичный канал',
      points: 75
    },
    discord: {
      name: 'Discord',
      icon: Hash,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      placeholder: 'username#1234',
      instructions: 'Обновите статус или отправьте сообщение на сервер',
      points: 50
    }
  }

  const renderPlatform = (platform: 'twitter' | 'telegram' | 'discord') => {
    const config = platformConfig[platform]
    const Icon = config.icon
    const currentStep = step[platform] || 'input'
    const account = accounts.find(a => a.platform === platform)
    const isLoading = loading[platform]

    return (
      <div key={platform} className={`p-4 border ${config.borderColor} ${config.bgColor} rounded-lg`}>
        <div className="flex items-center gap-3 mb-3">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <h3 className="font-semibold text-white">{config.name}</h3>
          {account?.verified && (
            <CheckCircle className="w-4 h-4 text-green-400" />
          )}
          <span className="text-sm text-gray-400 ml-auto">+{config.points} очков</span>
        </div>

        {currentStep === 'input' && (
          <div className="space-y-3">
            <Input
              placeholder={config.placeholder}
              value={inputs[platform] || ''}
              onChange={(e) => setInputs({ ...inputs, [platform]: e.target.value })}
              className="bg-gray-800 border-gray-600 text-white"
            />
            <Button
              onClick={() => startVerification(platform)}
              disabled={!inputs[platform]?.trim() || isLoading}
              className="w-full"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Обработка...
                </>
              ) : (
                'Начать верификацию'
              )}
            </Button>
          </div>
        )}

        {currentStep === 'verify' && (
          <div className="space-y-3">
            <div className="p-3 bg-gray-800 rounded border border-gray-600">
              <p className="text-sm text-gray-300 mb-2">{config.instructions}:</p>
              <div className="bg-gray-900 p-2 rounded text-sm text-white font-mono break-all">
                {verificationCodes[platform]}
              </div>
              <Button
                onClick={() => copyToClipboard(verificationCodes[platform])}
                variant="outline"
                size="sm"
                className="mt-2 w-full"
              >
                Скопировать код
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-yellow-400">
              <AlertCircle className="w-4 h-4" />
              <span>После публикации нажмите "Проверить"</span>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => completeVerification(platform)}
                disabled={isLoading}
                className="flex-1"
                size="sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  'Проверить'
                )}
              </Button>
              <Button
                onClick={() => setStep({ ...step, [platform]: 'input' })}
                variant="outline"
                size="sm"
              >
                Отмена
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'verified' && account && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Привязан: {account.username}</span>
            </div>
            <div className="text-xs text-gray-400">
              Верифицирован: {new Date(account.verifiedAt!).toLocaleDateString('ru-RU')}
            </div>
            {account.points && (
              <div className="text-xs text-[#FF9500]">
                Получено очков: +{account.points}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 border border-purple-500/30 bg-gradient-to-br from-gray-900 to-black rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white font-serif">Социальные аккаунты</h2>
        <div className="text-sm text-purple-300">
          {accounts.filter(a => a.verified).length}/3 привязано
        </div>
      </div>

      <div className="space-y-4">
        {(['twitter', 'telegram', 'discord'] as const).map(renderPlatform)}
      </div>

      <div className="mt-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
        <h4 className="font-semibold text-purple-300 mb-2">💡 Как это работает:</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Введите ваш username в социальной сети</li>
          <li>• Опубликуйте код верификации в своем аккаунте</li>
          <li>• Нажмите "Проверить" для завершения привязки</li>
          <li>• Получите бонусные очки за каждый привязанный аккаунт</li>
        </ul>
      </div>
    </div>
  )
}