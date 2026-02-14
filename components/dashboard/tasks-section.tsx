"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { apiCall } from "@/lib/api/authenticated-fetch"
import { completeTask } from "@/lib/api/client"
import { Check, ExternalLink, Twitter, Send, Users, Heart, Repeat, Loader2, AlertCircle, Link2, Gift } from "lucide-react"

interface Task {
  id: string
  type: string
  title: string
  description: string
  points: number
  icon: React.ReactNode
  link?: string
  completed: boolean
  requiresVerification: boolean
  verificationHint?: string
}

interface TasksSectionProps {
  walletAddress: string
  twitterConnected: boolean
  telegramConnected?: boolean
  completedTasks: string[]
  onTaskComplete: (taskId: string, points: number) => void
}

export function TasksSection({ walletAddress, twitterConnected, telegramConnected, completedTasks, onTaskComplete }: TasksSectionProps) {
  const [loadingTask, setLoadingTask] = useState<string | null>(null)
  const [verifyingTask, setVerifyingTask] = useState<string | null>(null)
  const [verifyUrl, setVerifyUrl] = useState("")
  const [verificationError, setVerificationError] = useState<string | null>(null) // Ошибка верификации
  const [loadError, setLoadError] = useState<string | null>(null) // Ошибка загрузки
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'available' | 'active' | 'completed'>('available')
  const inputRef = useRef<HTMLInputElement>(null)

  // ✅ Wallet ID больше не нужен для API call
  // Получаем его только для отображения в hints
  const walletId = typeof window !== 'undefined' 
    ? localStorage.getItem('walletAddress')?.slice(2, 8).toLowerCase() || 'xxxxxx'
    : 'xxxxxx'

  // Focus input when verificationError changes
  useEffect(() => {
    if (verificationError && inputRef.current) {
      inputRef.current.focus()
    }
  }, [verificationError])

  // Load tasks from API
  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const res = await apiCall("/api/tasks", {
        method: "GET"
      })

      const data = await res.json()
      
      if (data.success) {
        // Map API response to component format
        const mappedTasks: Task[] = data.tasks.map((apiTask: any) => ({
          id: apiTask.id.toString(),
          type: apiTask.task_type,
          title: apiTask.title,
          description: apiTask.description || "",
          points: apiTask.tokens || 0, // Use tokens directly as KCODE
          icon: getTaskIcon(apiTask.task_type),
          link: apiTask.link,
          completed: apiTask.completed,
          requiresVerification: true, // ✅ ВСЕ задания теперь требуют верификации
          verificationHint: apiTask.verification_hint?.replace('{wallet_code}', walletId) || ""
        }))
        
        setTasks(mappedTasks)
        setLoadError(null) // Очищаем ошибку загрузки
      } else {
        setLoadError("Failed to load tasks")
      }
    } catch (err) {
      console.error("Error loading tasks:", err)
      setLoadError("Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'twitter_follow': return <Twitter size={20} />
      case 'twitter_like': return <Heart size={20} />
      case 'twitter_retweet': return <Repeat size={20} />
      case 'twitter_comment': return <Twitter size={20} />
      case 'telegram_channel': return <Send size={20} />
      case 'telegram_chat': return <Users size={20} />
      case 'discord': return <Users size={20} />
      default: return <Heart size={20} />
    }
  }

  const handleVerifyTask = async (task: Task) => {
    // For twitter_follow, no URL needed - just verify subscription
    if (task.type === 'twitter_follow') {
      // URL not required for follow verification
    } else if (!verifyUrl.trim()) {
      setVerificationError("Please enter your tweet URL")
      return
    }

    setLoadingTask(task.id)
    setVerificationError(null)
    setSuccessMessage(null)

    try {
      // Get auth data from localStorage
      const walletAddress = localStorage.getItem('kabbalah_wallet')
      const userId = localStorage.getItem('kabbalah_user_id')
      
      if (!walletAddress || !userId) {
        setVerificationError("Authentication error. Please reconnect your wallet.")
        return
      }

      // Parse wallet data if it's JSON
      let parsedWalletAddress = walletAddress
      try {
        const walletData = JSON.parse(walletAddress)
        parsedWalletAddress = walletData.address
      } catch (e) {
        // If not JSON, use as is
      }

      console.log("[Tasks] Attempting verification with:", {
        walletAddress: parsedWalletAddress?.slice(0, 10) + "...",
        userId: userId?.slice(0, 8) + "..."
      })

      // For twitter_follow, use a dummy URL since we only check subscription
      const tweetUrl = task.type === 'twitter_follow' 
        ? 'https://twitter.com/KabbalahCode' 
        : verifyUrl

      // Try direct API first
      let res = await fetch("/api/tasks/verify-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          taskType: task.type,
          tweetUrl: tweetUrl,
          walletAddress: parsedWalletAddress,
          userId: userId
        }),
      })

      const data = await res.json()

      if (data.success) {
        // Show success message with transaction link
        let message = data.message || `✅ Task completed! You earned ${task.points.toFixed(2)} KCODE`
        
        // Add transaction link if available
        if (data.transactionHash) {
          const explorerUrl = `https://amoy.polygonscan.com/tx/${data.transactionHash}`
          message += ` | <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="text-[#FF9500] hover:underline">View TX ↗</a>`
        }
        
        setSuccessMessage(message)
        onTaskComplete(task.id, task.points)
        setVerifyingTask(null)
        setVerifyUrl("")
        setVerificationError(null)
        
        // Auto-hide success message after 10 seconds (longer for transaction link)
        setTimeout(() => setSuccessMessage(null), 10000)
        
        // Reload tasks to update UI
        await loadTasks()
      } else {
        // ✅ При ошибке - автоматически закрываем форму и показываем ошибку
        setVerificationError(data.error || "Verification failed. Make sure your tweet contains #KabbalahCode and your wallet ID.")
        setVerifyingTask(null) // Закрываем форму
        setVerifyUrl("") // Очищаем URL
      }
    } catch (err) {
      // ✅ При exception - тоже закрываем форму
      setVerificationError("Verification failed. Please try again.")
      setVerifyingTask(null)
      setVerifyUrl("")
    } finally {
      setLoadingTask(null)
    }
  }

  const handleTaskClick = async (task: Task) => {
    if (task.completed || loadingTask) return

    // Don't allow clicking on completed tasks
    if (task.completed) {
      setVerificationError("This task is already completed")
      return
    }

    // Open link
    if (task.link) {
      window.open(task.link, "_blank")
    }

    // Auto-complete Telegram tasks if Telegram is connected
    if (task.type === 'telegram' && telegramConnected) {
      setLoadingTask(task.id)
      try {
        // Get auth data from localStorage
        const walletData = localStorage.getItem('kabbalah_wallet')
        const userId = localStorage.getItem('kabbalah_user_id')
        
        if (!walletData || !userId) {
          setVerificationError("Authentication error. Please reconnect your wallet.")
          return
        }

        // Parse wallet data if it's JSON
        let walletAddress = walletData
        try {
          const parsedWallet = JSON.parse(walletData)
          walletAddress = parsedWallet.address || walletData
        } catch (e) {
          // If not JSON, use as is
        }

        // Use direct API for Telegram tasks
        const res = await fetch("/api/tasks/verify-direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: task.id,
            taskType: task.type,
            tweetUrl: 'https://t.me/KabbalahCode', // Dummy URL for Telegram tasks
            walletAddress: walletAddress,
            userId: userId
          }),
        })

        const data = await res.json()

        if (data.success) {
          onTaskComplete(task.id, task.points)
          setVerificationError(null)
          // Reload tasks to update UI
          loadTasks()
        } else {
          setVerificationError(data.error || "Failed to complete Telegram task")
        }
      } catch (err) {
        setVerificationError("Failed to complete Telegram task. Please try again.")
      } finally {
        setLoadingTask(null)
      }
      return
    }

    // Auto-complete Twitter tasks if Twitter is connected and task doesn't require tweet verification
    if ((task.type.startsWith('twitter') || task.type === 'twitter') && twitterConnected && !task.requiresVerification) {
      // ❌ УБИРАЕМ АВТОЗАВЕРШЕНИЕ - теперь все Twitter задания требуют реальной проверки
      setVerifyingTask(task.id)
      setVerificationError(null)
      return
    }

    // If requires verification, show input
    if (task.requiresVerification) {
      setVerifyingTask(task.id)
      setVerificationError(null)
      return
    }

    // ✅ For non-verification tasks, complete immediately
    setLoadingTask(task.id)
    try {
      const data = await completeTask(task.id, task.type)
      
      if (data.success) {
        onTaskComplete(task.id, task.points)
        setVerificationError(null)
        // Reload tasks to update UI
        loadTasks()
      } else {
        setVerificationError(data.error || "Failed to complete task")
      }
    } catch (err) {
      setVerificationError("Failed to complete task. Please try again.")
    } finally {
      setLoadingTask(null)
    }
  }

  const totalEarned = tasks.filter((t) => t.completed).reduce((sum, t) => sum + t.points, 0)
  const totalPossible = tasks.reduce((sum, t) => sum + t.points, 0)

  const filteredTasks = tasks.filter(task => {
    switch (filter) {
      case 'available':
        return !task.completed && (!task.type.startsWith('twitter') || twitterConnected) && (task.type !== 'telegram' || telegramConnected)
      case 'active':
        return !task.completed
      case 'completed':
        return task.completed
      default:
        return true
    }
  })

  // Don't show verification input for completed tasks
  const shouldShowVerification = (task: Task) => {
    return verifyingTask === task.id && !task.completed
  }

  return (
    <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white font-serif">Social Tasks</h2>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {(['available', 'active', 'completed'] as const).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  filter === filterType
                    ? 'bg-[#FF9500] text-black'
                    : 'bg-black/50 text-white/70 hover:text-white'
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </button>
            ))}
          </div>
          <span className="text-white/50 text-sm">
            {totalEarned.toFixed(1)}/{totalPossible.toFixed(1)} KCODE
          </span>
        </div>
      </div>

      {!twitterConnected && (
        <div className="mb-4 p-3 bg-[#FF9500]/10 border border-[#FF9500]/30 text-[#FF9500] text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          Verify Twitter first in Dashboard tab
        </div>
      )}

      {!telegramConnected && (
        <div className="mb-4 p-3 bg-[#0088cc]/10 border border-[#0088cc]/30 text-[#0088cc] text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          Connect Telegram in Profile tab to unlock Telegram tasks
        </div>
      )}

      {verificationError && !verifyingTask && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {verificationError}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
          <Check size={16} />
          <span dangerouslySetInnerHTML={{ __html: successMessage }} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-[#FF9500]" />
          <span className="ml-2 text-white/50">Loading tasks...</span>
        </div>
      ) : loadError ? (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {loadError}
          <button 
            onClick={loadTasks}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4">
                <Gift size={48} className="mx-auto text-[#FF9500]/30" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {filter === 'completed' ? 'No completed tasks yet' : 'More tasks soon!'}
              </h3>
              <p className="text-white/50 text-sm">
                {filter === 'completed' 
                  ? 'Complete tasks to earn KCODE tokens'
                  : 'New tasks will be added regularly. Check back soon!'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
          <div key={task.id}>
            <button
              onClick={() => handleTaskClick(task)}
              disabled={
                task.completed || 
                loadingTask === task.id || 
                (!twitterConnected && task.type.startsWith("twitter")) ||
                (!telegramConnected && task.type === "telegram")
              }
              className={`w-full p-4 border flex items-center gap-4 transition-all ${
                task.completed
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-[#FF9500]/20 hover:border-[#FF9500]/50 hover:bg-[#FF9500]/5"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center ${task.completed ? "text-green-500" : "text-[#FF9500]"}`}
              >
                {loadingTask === task.id ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : task.completed ? (
                  <Check size={20} />
                ) : (
                  task.icon
                )}
              </div>

              <div className="flex-1 text-left">
                <p className={`font-medium ${task.completed ? "text-green-400" : "text-white"}`}>{task.title}</p>
                <p className="text-white/40 text-sm">{task.description}</p>
              </div>

              <div className="text-right">
                <div className="space-y-1">
                  {task.completed ? (
                    <span className="font-bold block text-green-400">✓ Done</span>
                  ) : (
                    <span className="text-green-400 font-bold text-sm">
                      +{task.points.toFixed(2)} KCODE
                    </span>
                  )}
                </div>
              </div>

              {!task.completed && <ExternalLink size={16} className="text-white/30" />}
            </button>

            {/* Verification input */}
            {shouldShowVerification(task) && (
              <div className="mt-2 p-4 bg-black/50 border border-[#FF9500]/20 space-y-3">
                {task.type === 'twitter_follow' ? (
                  <>
                    <p className="text-white/50 text-sm">
                      Follow <span className="text-[#FF9500]">{task.link ? new URL(task.link).pathname.split('/').pop() : '@KabbalahCode'}</span> on Twitter, then click Verify to check your subscription.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifyTask(task)}
                        disabled={loadingTask === task.id}
                        className="px-6 py-2 bg-[#FF9500] text-black font-bold text-sm hover:bg-[#FFB340] disabled:opacity-50"
                      >
                        {loadingTask === task.id ? "Verifying..." : "Verify"}
                      </button>
                      <button
                        onClick={() => {
                          setVerifyingTask(null)
                          setVerificationError(null)
                          setVerifyUrl("")
                        }}
                        className="px-4 py-2 text-white/50 text-sm hover:text-white transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : task.type === 'twitter_engagement' ? (
                  <>
                    <p className="text-white/50 text-sm">
                      Like, Retweet, and Comment on the tweet. Then paste <span className="text-[#FF9500]">the link to your comment</span> to verify.
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          ref={inputRef}
                          type="text"
                          placeholder="Paste your comment URL"
                          value={verifyUrl}
                          onChange={(e) => setVerifyUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && verifyUrl.trim()) {
                              handleVerifyTask(task)
                            }
                          }}
                          className="w-full bg-black border border-[#FF9500]/30 pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-[#FF9500]"
                        />
                      </div>
                      <button
                        onClick={() => handleVerifyTask(task)}
                        disabled={loadingTask === task.id || !verifyUrl.trim()}
                        className="px-4 py-2 bg-[#FF9500] text-black font-bold text-sm hover:bg-[#FFB340] disabled:opacity-50"
                      >
                        {loadingTask === task.id ? "Verifying..." : "Verify"}
                      </button>
                      <button
                        onClick={() => {
                          setVerifyingTask(null)
                          setVerificationError(null)
                          setVerifyUrl("")
                        }}
                        className="px-4 py-2 text-white/50 text-sm hover:text-white transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-white/50 text-sm">
                      Complete the action first, then paste the verification link.
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                          ref={inputRef}
                          type="text"
                          placeholder="Paste verification URL"
                          value={verifyUrl}
                          onChange={(e) => setVerifyUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && verifyUrl.trim()) {
                              handleVerifyTask(task)
                            }
                          }}
                          className="w-full bg-black border border-[#FF9500]/30 pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-[#FF9500]"
                        />
                      </div>
                      <button
                        onClick={() => handleVerifyTask(task)}
                        disabled={loadingTask === task.id || !verifyUrl.trim()}
                        className="px-4 py-2 bg-[#FF9500] text-black font-bold text-sm hover:bg-[#FFB340] disabled:opacity-50"
                      >
                        {loadingTask === task.id ? "Verifying..." : "Verify"}
                      </button>
                      <button
                        onClick={() => {
                          setVerifyingTask(null)
                          setVerificationError(null)
                          setVerifyUrl("")
                        }}
                        className="px-4 py-2 text-white/50 text-sm hover:text-white transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )))}
      </div>
      )}
    </div>
  )
}