"use client"

import { useEffect, useState, Suspense, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { formatAddress } from "@/lib/web3/ethereum"
import { User, Flame, Sparkles, LogOut, ListTodo, Gift, LayoutDashboard, Zap, TrendingUp } from "lucide-react"
import { DailyRitual } from "@/components/dashboard/daily-ritual"
import { DailyMeditation } from "@/components/dashboard/daily-meditation"
import { AskKabbalah } from "@/components/dashboard/ask-kabbalah"
import { QuickAnswer } from "@/components/dashboard/quick-answer"
import { WheelOfFortune } from "@/components/dashboard/wheel-of-fortune"
import { WheelSpinHistory } from "@/components/dashboard/wheel-spin-history"
import { TreeProgress } from "@/components/dashboard/tree-progress"
import { TwitterVerification } from "@/components/dashboard/twitter-verification"
import { TasksSection } from "@/components/dashboard/tasks-section"
import { ProfileTab } from "@/components/dashboard/profile-tab"
import { TelegramOAuth } from "@/components/dashboard/telegram-oauth"
import { DiscordOAuth } from "@/components/dashboard/discord-oauth"
import { CompactNetworkStatus } from "@/components/web3/CompactNetworkStatus"
import { AllTransactionsHistory } from "@/components/web3/AllTransactionsHistory"
import { SessionProvider, useSession } from "@/components/auth/SessionProvider"
import { apiCall } from "@/lib/api/authenticated-fetch"

interface WalletData {
  address: string
  walletNumber: number
  connectedAt: number
}

interface UserData {
  id: string
  wallet_address: string
  wallet_number: number
  twitter_username: string | null
  telegram_username: string | null
  discord_username: string | null
  level: number
  total_kcode: number  // Changed from total_points
  tokens_minted: number  // New field for on-chain tracking
  current_streak: number
  longest_streak: number
  last_ritual_date: string | null
  free_spins: number
  referral_code: string
  created_at: string
  active_multiplier?: number
  multiplier_expires_at?: string | null
  active_boost_percent?: number
  boost_expires_at?: string | null
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  created_at: string
}

type Tab = "dashboard" | "tasks" | "wheel" | "profile"

function DashboardContent() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [blockchainTxCount, setBlockchainTxCount] = useState<number>(0) // Количество blockchain транзакций
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("dashboard")
  const [showTelegramModal, setShowTelegramModal] = useState(false)
  const [showDiscordModal, setShowDiscordModal] = useState(false)
  const [kcodeBalance, setKcodeBalance] = useState<string>("0.0") // Реальный blockchain баланс
  const [totalSpinsToday, setTotalSpinsToday] = useState<number>(0) // Состояние для общего количества спинов
  const [tokenHistoryRefresh, setTokenHistoryRefresh] = useState<number>(0) // Триггер для обновления Token History
  const [hasMeditatedToday, setHasMeditatedToday] = useState(false) // Daily Meditation status
  const [notification, setNotification] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasChecked = useRef(false)
  
  // Use session manager
  const { session, userId, isAuthenticated, signOut } = useSession()

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification?.show) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const loadUserData = useCallback(async (walletAddress: string, userId?: string) => {
    try {
      const res = await apiCall(`/api/user?wallet=${walletAddress}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      
      const data = await res.json()

      if (data.success && data.user) {
        setUserData(data.user)

        const txRes = await apiCall(`/api/user/transactions`)
        const txData = await txRes.json()
        if (txData.success) {
          setTransactions(txData.transactions || [])
        }

        const tasksRes = await apiCall(`/api/user/tasks?wallet=${walletAddress}`)
        const tasksData = await tasksRes.json()
        if (tasksData.success) {
          setCompletedTasks(tasksData.completedTasks || [])
        }

        // Load today's spins count
        await loadSpinsCount()
        
        // Load meditation status
        try {
          const meditationRes = await apiCall('/api/meditation/today')
          const meditationData = await meditationRes.json()
          
          if (meditationData.success) {
            setHasMeditatedToday(meditationData.hasCompletedToday || false)
            console.log('[Dashboard] Meditation status loaded:', meditationData.hasCompletedToday)
          }
        } catch (error) {
          console.error("[Dashboard] Failed to load meditation status:", error)
          setHasMeditatedToday(false)
        }
      }
    } catch (error) {
      console.error("[Dashboard] Failed to load user data:", error)
      throw error
    }
  }, []) // Remove loadMeditationStatus from dependencies

  // Функция для загрузки количества спинов за сегодня
  const loadSpinsCount = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await apiCall(`/api/wheel/spins-count?date=${today}`)
      const data = await res.json()
      
      if (data.success) {
        setTotalSpinsToday(data.count || 0)
      }
    } catch (error) {
      console.error("[Dashboard] Failed to load spins count:", error)
    }
  }, [])

  // Функция для загрузки реального blockchain баланса KCODE
  const loadKcodeBalance = useCallback(async () => {
    if (!wallet) return
    
    try {
      const res = await apiCall(`/api/web3/balance?address=${wallet.address}`)
      const data = await res.json()
      
      const tokenBalance = data.tokenBalance ?? data.data?.tokenBalance
      
      if (data.success && tokenBalance !== undefined) {
        const balance = parseFloat(tokenBalance).toFixed(2)
        setKcodeBalance(balance)
      }
    } catch (error) {
      console.error("[Dashboard] Failed to load KCODE balance:", error)
    }
  }, [wallet])

  // Функция для загрузки количества blockchain транзакций
  const loadBlockchainTxCount = useCallback(async () => {
    try {
      const res = await apiCall('/api/web3/transactions')
      const data = await res.json()
      
      if (data.success && data.transactions) {
        setBlockchainTxCount(data.count || data.transactions.length)
      }
    } catch (error) {
      console.error("[Dashboard] Failed to load blockchain tx count:", error)
    }
  }, [])

  // Загружаем blockchain баланс и tx count при изменении wallet
  useEffect(() => {
    if (wallet) {
      loadKcodeBalance()
      loadBlockchainTxCount()
    }
  }, [wallet, loadKcodeBalance, loadBlockchainTxCount])

  useEffect(() => {
    if (hasChecked.current) return
    hasChecked.current = true

    console.log("[Dashboard] Checking authentication...", {
      isAuthenticated,
      hasSession: !!session,
      hasUserId: !!userId,
      localStorage: {
        hasWallet: !!localStorage.getItem("kabbalah_wallet"),
        hasUserId: !!localStorage.getItem("kabbalah_user_id")
      }
    })

    // If authenticated via session manager, use that
    if (isAuthenticated && session) {
      console.log("[Dashboard] ✅ Authenticated via session manager")
      
      // Try to get wallet address from session metadata
      const walletAddress = session?.user?.user_metadata?.wallet_address
      
      if (walletAddress) {
        const walletData = {
          address: walletAddress,
          walletNumber: 1, // Will be updated from user data
          connectedAt: Date.now()
        }
        setWallet(walletData)
        loadUserData(walletAddress).finally(() => setIsLoading(false))
      } else {
        console.error("[Dashboard] No wallet address in session metadata")
        signOut()
      }
      return
    }

    // If not authenticated via session manager, check localStorage fallback
    const stored = localStorage.getItem("kabbalah_wallet")
    const storedUserId = localStorage.getItem("kabbalah_user_id")
    
    console.log("[Dashboard] Checking localStorage:", {
      hasWallet: !!stored,
      hasUserId: !!storedUserId,
      walletData: stored ? JSON.parse(stored).address?.slice(0, 10) + "..." : null
    })
    
    if (!stored || !storedUserId) {
      console.log("[Dashboard] No wallet data found, redirecting to home")
      router.push("/")
      return
    }

    try {
      const data = JSON.parse(stored) as WalletData
      if (!data.address || !data.walletNumber || !data.connectedAt) {
        console.log("[Dashboard] Invalid wallet data, clearing and redirecting")
        localStorage.removeItem("kabbalah_wallet")
        localStorage.removeItem("kabbalah_user_id")
        router.push("/")
        return
      }

      const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
      if (Date.now() - data.connectedAt > maxAge) {
        console.log("[Dashboard] Wallet data expired, clearing and redirecting")
        localStorage.removeItem("kabbalah_wallet")
        localStorage.removeItem("kabbalah_user_id")
        router.push("/")
        return
      }

      console.log("[Dashboard] ✅ Using localStorage authentication")
      
      // Используем localStorage данные с правильной аутентификацией
      setWallet(data)
      
      loadUserData(data.address, storedUserId).catch((error) => {
        console.error("[Dashboard] API calls failed:", error)
        // Если API calls не работают, перенаправляем на подключение кошелька
        localStorage.removeItem("kabbalah_wallet")
        localStorage.removeItem("kabbalah_user_id")
        router.push("/?reconnect=true")
      }).finally(() => {
        setIsLoading(false)
      })
      
    } catch (error) {
      console.error("[Dashboard] Error parsing wallet data:", error)
      localStorage.removeItem("kabbalah_wallet")
      localStorage.removeItem("kabbalah_user_id")
      router.push("/")
    }
  }, [router, loadUserData, isAuthenticated, session, userId, signOut])

  useEffect(() => {
    const error = searchParams.get("error")
    if (error) {
      window.history.replaceState({}, "", "/dashboard")
    }
  }, [searchParams])

  const handleDisconnect = useCallback(() => {
    console.log("[Dashboard] Disconnecting...")
    signOut() // This will clear session and redirect to home
  }, [signOut])

  const handleRitualComplete = useCallback(async (
    kcode: number,
    newStreak: number,
    newFreeSpins: number,
    tokensAwarded?: number,
    transactionHash?: string,
    alternativeReward?: any
  ) => {
    console.log("[Dashboard] handleRitualComplete called", {
      kcode,
      newStreak,
      newFreeSpins,
      tokensAwarded,
      currentKcode: userData?.total_kcode
    })
    
    // ✅ Show success notification
    setNotification({
      show: true,
      message: `✅ Daily Ritual Complete! +${kcode} KCODE earned (Streak: ${newStreak} days)`,
      type: 'success'
    })
    
    // ✅ Trigger Token History refresh
    setTokenHistoryRefresh(prev => prev + 1)
    
    // Немедленно обновляем данные в локальном состоянии
    if (userData) {
      const newUserData = {
        ...userData,
        total_kcode: userData.total_kcode + kcode,
        current_streak: newStreak,
        free_spins: newFreeSpins,
      }
      console.log("[Dashboard] Updating userData:", {
        old: userData.total_kcode,
        new: newUserData.total_kcode
      })
      setUserData(newUserData)
    }
    
    // Обновляем blockchain баланс и tx count если были заминчены токены
    if (tokensAwarded && tokensAwarded > 0) {
      setTimeout(() => {
        loadKcodeBalance()
        loadBlockchainTxCount()
      }, 2000)
    }
    
    // Затем перезагружаем полные данные с сервера
    if (wallet) {
      console.log("[Dashboard] Reloading user data from server...")
      await loadUserData(wallet.address)
    }
  }, [wallet, userData, loadUserData, loadKcodeBalance, loadBlockchainTxCount])

  const handleMeditationComplete = useCallback(async (kcode: number) => {
    console.log("[Dashboard] handleMeditationComplete called", { kcode })
    
    // Show success notification
    setNotification({
      show: true,
      message: `🧘 Daily Meditation Complete! +${kcode} KCODE earned`,
      type: 'success'
    })
    
    // Mark as completed
    setHasMeditatedToday(true)
    
    // Update user data
    if (userData) {
      const newUserData = {
        ...userData,
        total_kcode: userData.total_kcode + kcode,
      }
      setUserData(newUserData)
    }
    
    // Trigger Token History refresh
    setTokenHistoryRefresh(prev => prev + 1)
    
    // Reload full data from server
    if (wallet) {
      await loadUserData(wallet.address)
    }
  }, [wallet, userData, loadUserData])

  const handleWheelSpin = useCallback(async (
    reward: any,
    kcodeChange: number,
    newFreeSpins: number,
    tokensAwarded?: number,
    transactionHash?: string,
    alternativeReward?: any
  ) => {
    console.log("[Dashboard] handleWheelSpin called", {
      reward,
      kcodeChange,
      newFreeSpins,
      tokensAwarded,
      currentKcode: userData?.total_kcode,
      currentFreeSpins: userData?.free_spins
    })
    
    // ✅ Show notification for wheel spin
    if (kcodeChange > 0) {
      setNotification({
        show: true,
        message: `🎰 Wheel Spin! +${kcodeChange} KCODE earned`,
        type: 'success'
      })
    } else if (kcodeChange < 0) {
      setNotification({
        show: true,
        message: `🎰 Wheel Spin! ${Math.abs(kcodeChange)} KCODE spent`,
        type: 'info'
      })
    } else if (reward.type === 'multiplier') {
      setNotification({
        show: true,
        message: `🎰 Wheel Spin! x${reward.value} Multiplier activated!`,
        type: 'success'
      })
    } else if (reward.type === 'boost') {
      setNotification({
        show: true,
        message: `🎰 Wheel Spin! +${reward.value}% Boost activated!`,
        type: 'success'
      })
    }
    
    // ✅ Trigger Token History refresh
    setTokenHistoryRefresh(prev => prev + 1)
    
    // Немедленно обновляем все данные в локальном состоянии
    if (userData) {
      const newUserData = {
        ...userData,
        free_spins: newFreeSpins,
        total_kcode: userData.total_kcode + kcodeChange,
        // Обновляем мультипликаторы если они были в награде
        active_multiplier: reward.type === 'multiplier' ? reward.value : userData.active_multiplier,
        multiplier_expires_at: reward.type === 'multiplier' 
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
          : userData.multiplier_expires_at,
        active_boost_percent: reward.type === 'boost' ? reward.value : userData.active_boost_percent,
        boost_expires_at: reward.type === 'boost' 
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
          : userData.boost_expires_at,
      }
      console.log("[Dashboard] Updating userData:", {
        oldKcode: userData.total_kcode,
        newKcode: newUserData.total_kcode,
        kcodeChange,
        oldFreeSpins: userData.free_spins,
        newFreeSpins: newUserData.free_spins
      })
      setUserData(newUserData)
    }
    
    // Обновляем счетчик спинов
    setTotalSpinsToday(prev => prev + 1)
    
    // Обновляем blockchain баланс и tx count если были заминчены токены
    if (tokensAwarded && tokensAwarded > 0) {
      setTimeout(() => {
        loadKcodeBalance()
        loadBlockchainTxCount()
      }, 2000)
    }
    
    // Затем перезагружаем полные данные с сервера для синхронизации
    if (wallet) {
      console.log("[Dashboard] Reloading user data from server...")
      await loadUserData(wallet.address)
    }
  }, [wallet, userData, loadUserData, loadKcodeBalance, loadBlockchainTxCount])

  const handleTwitterVerified = useCallback(async () => {
    if (!wallet) return
    await loadUserData(wallet.address)
  }, [wallet, loadUserData])

  const handleTaskComplete = useCallback(
    async (taskId: string, points: number) => {
      setCompletedTasks((prev) => [...prev, taskId])
      if (wallet) await loadUserData(wallet.address)
    },
    [wallet, loadUserData],
  )

  const handleTelegramConnected = useCallback(
    async (username: string) => {
      setShowTelegramModal(false)
      if (wallet) await loadUserData(wallet.address)
    },
    [wallet, loadUserData],
  )

  const handleDiscordConnected = useCallback(
    async (username: string) => {
      setShowDiscordModal(false)
      if (wallet) await loadUserData(wallet.address)
    },
    [wallet, loadUserData],
  )

  // Listen for Discord connect event
  useEffect(() => {
    const handleConnectDiscord = () => setShowDiscordModal(true)
    window.addEventListener('connect-discord', handleConnectDiscord)
    return () => window.removeEventListener('connect-discord', handleConnectDiscord)
  }, [])

  if (isLoading || !wallet) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#FF9500] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#FF9500] font-serif">Loading your destiny...</p>
          {/* Debug info */}
          <div className="text-xs text-white/30 text-center max-w-md">
            <p>Checking authentication...</p>
            <p>Wallet: {wallet ? wallet.address.slice(0, 10) + "..." : "Not found"}</p>
            <p>Loading: {isLoading ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>
    )
  }

  const displayData = userData || {
    wallet_address: wallet.address,
    wallet_number: wallet.walletNumber,
    twitter_username: null,
    telegram_username: null,
    discord_username: null,
    level: 1,
    total_kcode: 0,
    tokens_minted: 0,
    current_streak: 0,
    longest_streak: 0,
    last_ritual_date: null,
    free_spins: 1,
    referral_code: wallet.address.slice(2, 10).toUpperCase(),
    created_at: new Date().toISOString(),
    active_multiplier: 1,
    multiplier_expires_at: null,
    active_boost_percent: 0,
    boost_expires_at: null,
  }

  const hasCompletedToday = displayData.last_ritual_date === new Date().toISOString().split("T")[0]

  // Check if boosters are still active
  const now = Date.now()
  const multiplierActive =
    displayData.multiplier_expires_at && new Date(displayData.multiplier_expires_at).getTime() > now
  const boostActive = displayData.boost_expires_at && new Date(displayData.boost_expires_at).getTime() > now
  const activeMultiplier = multiplierActive ? displayData.active_multiplier || 1 : 1
  const activeBoost = boostActive ? displayData.active_boost_percent || 0 : 0

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "tasks" as Tab, label: "Tasks", icon: <ListTodo size={18} /> },
    { id: "wheel" as Tab, label: "Wheel of Fortune", icon: <Gift size={18} /> },
    { id: "profile" as Tab, label: "Profile", icon: <User size={18} /> },
  ]

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-[#FF9500]/20 sticky top-0 bg-black/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#FF9500] font-bold text-xl tracking-wider">KABBALAH</span>
            <span className="text-white font-bold text-xl tracking-wider">CODE</span>
          </Link>

          <div className="flex items-center gap-4">
            {(activeMultiplier > 1 || activeBoost > 0) && (
              <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-[#FF9500]/5 border border-[#FF9500]/20">
                {activeMultiplier > 1 && (
                  <span className="flex items-center gap-1 text-[#FF9500] text-xs">
                    <Zap size={12} /> x{activeMultiplier}
                  </span>
                )}
                {activeBoost > 0 && (
                  <span className="flex items-center gap-1 text-[#FFB340] text-xs">
                    <TrendingUp size={12} /> +{activeBoost}%
                  </span>
                )}
              </div>
            )}
            <CompactNetworkStatus walletAddress={wallet.address} />
            {/* Реальный blockchain баланс */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30">
              <span className="text-green-400 font-bold text-xs">KCODE</span>
              <span className="text-green-400 font-bold tabular-nums">
                {kcodeBalance}
              </span>
            </div>
            <span className="text-white/50 text-sm font-mono hidden md:block">{formatAddress(wallet.address)}</span>
            <button onClick={handleDisconnect} className="p-2 text-white/50 hover:text-red-400 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-[#FF9500]/10 bg-black/50 sticky top-[73px] z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "text-[#FF9500] border-[#FF9500]"
                    : "text-white/50 border-transparent hover:text-white/70"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ✅ Notification Toast */}
      {notification?.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`
            p-4 border-2 shadow-lg max-w-md
            ${notification.type === 'success' ? 'bg-green-500/10 border-green-500' : ''}
            ${notification.type === 'error' ? 'bg-red-500/10 border-red-500' : ''}
            ${notification.type === 'info' ? 'bg-blue-500/10 border-blue-500' : ''}
          `}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className={`
                  font-bold text-sm
                  ${notification.type === 'success' ? 'text-green-400' : ''}
                  ${notification.type === 'error' ? 'text-red-400' : ''}
                  ${notification.type === 'info' ? 'text-blue-400' : ''}
                `}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-white/50 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <>
            {/* Welcome Banner */}
            <div className="mb-8 p-6 border border-[#FF9500]/30 bg-gradient-to-r from-[#FF9500]/10 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-16 h-16 bg-[#FF9500] flex items-center justify-center text-black font-bold text-2xl flex-shrink-0">
                  {displayData.wallet_number}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white tracking-wide">
                    Welcome, Seeker
                    {displayData.twitter_username && (
                      <span className="text-[#FF9500] text-lg ml-2">@{displayData.twitter_username}</span>
                    )}
                  </h1>
                  <p className="text-white/50">
                    Destiny Number: <span className="text-[#FF9500]">{displayData.wallet_number}</span>
                    {" • "}Level <span className="text-[#FF9500]">{displayData.level}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="p-4 border border-[#FF9500]/20 bg-[#0a0a0a]">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#FF9500]" />
                  <span className="text-white/50 text-xs uppercase">Blockchain Txs</span>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {blockchainTxCount}
                </p>
                <p className="text-white/30 text-[10px] mt-1">On-chain transactions</p>
              </div>
              <div className="p-4 border border-[#FF9500]/20 bg-[#0a0a0a]">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-[#FF9500]" />
                  <span className="text-white/50 text-xs uppercase">Streak</span>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {displayData.current_streak} days
                </p>
                {/* Streak mini-progress */}
                <div className="mt-2">
                  <div className="h-1 bg-black/50 overflow-hidden">
                    <div
                      className="h-full bg-[#FF9500]"
                      style={{ width: `${((displayData.current_streak % 7) / 7) * 100}%` }}
                    />
                  </div>
                  <p className="text-white/30 text-[10px] mt-1">{7 - (displayData.current_streak % 7)} to +50 bonus</p>
                </div>
              </div>
              <AskKabbalah walletAddress={wallet.address} />
              <QuickAnswer walletAddress={wallet.address} />
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <DailyRitual
                walletAddress={wallet.address}
                walletNumber={displayData.wallet_number}
                currentStreak={displayData.current_streak}
                hasCompletedToday={hasCompletedToday}
                twitterConnected={!!displayData.twitter_username}
                onComplete={handleRitualComplete}
              />

              <DailyMeditation
                walletAddress={wallet.address}
                hasCompletedToday={hasMeditatedToday}
                onComplete={handleMeditationComplete}
              />
            </div>

            {/* Twitter Verification or Tree Progress */}
            <div className="grid lg:grid-cols-1 gap-6 mb-8">
              {!displayData.twitter_username ? (
                <TwitterVerification walletAddress={wallet.address} onVerified={handleTwitterVerified} />
              ) : (
                <TreeProgress totalPoints={displayData.total_kcode} unlockedSephirot={[1]} />
              )}
            </div>

            {/* ✅ All Transactions History - KCODE (testnet) + POL (mainnet) */}
            <div className="grid lg:grid-cols-1 gap-6">
              <AllTransactionsHistory 
                walletAddress={wallet.address} 
                refreshTrigger={tokenHistoryRefresh}
              />
            </div>
          </>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <TasksSection
            walletAddress={wallet.address}
            twitterConnected={!!displayData.twitter_username}
            telegramConnected={!!displayData.telegram_username}
            completedTasks={completedTasks}
            onTaskComplete={handleTaskComplete}
          />
        )}

        {/* Wheel of Fortune Tab */}
        {activeTab === "wheel" && (
          <>
            <WheelOfFortune
              walletAddress={wallet.address}
              freeSpinsAvailable={userData?.free_spins ?? displayData.free_spins}
              availableKcode={userData?.total_kcode ?? displayData.total_kcode}
              activeMultiplier={activeMultiplier}
              activeBoost={activeBoost}
              onSpinComplete={handleWheelSpin}
              onShowNotification={(message, type) => setNotification({ show: true, message, type })}
            />
            <WheelSpinHistory walletAddress={wallet.address} />
          </>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <ProfileTab
            user={displayData as UserData}
            transactions={transactions}
            referralCount={0}
            onConnectTwitter={() => setActiveTab("dashboard")}
            onConnectTelegram={() => setShowTelegramModal(true)}
          />
        )}
      </main>

      {/* Telegram OAuth Modal */}
      {showTelegramModal && (
        <TelegramOAuth
          walletAddress={wallet.address}
          onConnected={handleTelegramConnected}
          onClose={() => setShowTelegramModal(false)}
        />
      )}

      {/* Discord OAuth Modal */}
      {showDiscordModal && (
        <DiscordOAuth
          walletAddress={wallet.address}
          onConnected={handleDiscordConnected}
          onClose={() => setShowDiscordModal(false)}
        />
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <SessionProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-[#FF9500] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </SessionProvider>
  )
}
