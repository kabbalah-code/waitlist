"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatAddress } from "@/lib/web3/ethereum"
import { Users, BarChart3, Gift, Loader2, TrendingUp, Activity, Award, UserCheck, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

interface Stats {
  users: { total: number; active: number }
  points: { total: number }
  activity: { rituals: number; spins: number; referrals: number }
}

interface User {
  id: string
  wallet_address: string
  twitter_username: string | null
  telegram_username: string | null
  total_points: number
  ritual_streak: number
  last_ritual_date: string | null
  referral_code: string
  created_at: string
  tasks_completed: number
  points_from_tasks: number
  wheel_spins: number
  referrals_count: number
  is_active: boolean
}

export default function AdminPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"stats" | "users">("stats")
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [sortBy, setSortBy] = useState<keyof User>("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const router = useRouter()

  useEffect(() => {
    checkWallet()
  }, [])

  useEffect(() => {
    if (walletAddress && activeTab === "stats") {
      loadStats()
    }
  }, [walletAddress, activeTab])

  useEffect(() => {
    if (walletAddress && activeTab === "users") {
      loadUsers()
    }
  }, [walletAddress, activeTab])

  const checkWallet = async () => {
    try {
      const stored = localStorage.getItem("kabbalah_wallet")
      if (stored) {
        const { address } = JSON.parse(stored)
        setWalletAddress(address)
        await verifyAdmin(address)
      } else {
        router.push("/")
      }
    } catch {
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }

  const verifyAdmin = async (address: string) => {
    try {
      const res = await fetch(`/api/admin/stats?wallet=${address}`)
      const data = await res.json()

      if (!data.success && data.error === "Unauthorized") {
        router.push("/")
      }
    } catch (error) {
      console.error("[Admin] Verification error:", error)
      router.push("/")
    }
  }

  const loadStats = async () => {
    if (!walletAddress) return
    
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/admin/stats?wallet=${walletAddress}`)
      const data = await res.json()
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error("[Admin] Error loading stats:", error)
    } finally {
      setLoadingStats(false)
    }
  }

  const loadUsers = async () => {
    if (!walletAddress) return
    
    setLoadingUsers(true)
    try {
      const res = await fetch(`/api/admin/users?wallet=${walletAddress}`)
      const data = await res.json()
      
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error("[Admin] Error loading users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSort = (column: keyof User) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]
    
    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc" 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal
    }
    
    if (typeof aVal === "boolean" && typeof bVal === "boolean") {
      return sortOrder === "asc" 
        ? (aVal === bVal ? 0 : aVal ? 1 : -1)
        : (aVal === bVal ? 0 : bVal ? 1 : -1)
    }
    
    return 0
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#FF9500] text-xl">Loading...</div>
      </div>
    )
  }

  if (!walletAddress) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-[#FF9500]">Admin Panel</h1>
          <div className="flex items-center gap-4">
            <span className="text-white/50">{formatAddress(walletAddress)}</span>
            <button
              onClick={() => {
                localStorage.removeItem("kabbalah_wallet")
                router.push("/")
              }}
              className="px-4 py-2 border border-[#FF9500] text-[#FF9500] hover:bg-[#FF9500]/10 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-[#FF9500]/30">
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "stats"
                ? "border-b-2 border-[#FF9500] text-[#FF9500]"
                : "text-white/50 hover:text-white"
            }`}
          >
            <BarChart3 className="inline w-5 h-5 mr-2" />
            Statistics
          </button>
          <button
            onClick={() => router.push("/admin/tasks")}
            className="px-6 py-3 font-semibold text-white/50 hover:text-white transition"
          >
            <Gift className="inline w-5 h-5 mr-2" />
            Tasks
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === "users"
                ? "border-b-2 border-[#FF9500] text-[#FF9500]"
                : "text-white/50 hover:text-white"
            }`}
          >
            <Users className="inline w-5 h-5 mr-2" />
            Users
          </button>
        </div>

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            {loadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF9500]" />
                <span className="ml-3 text-white/50">Loading statistics...</span>
              </div>
            ) : stats ? (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="w-8 h-8 text-[#FF9500]" />
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {stats.users.total.toLocaleString()}
                    </div>
                    <div className="text-white/50 text-sm">Total Users</div>
                    <div className="mt-2 text-green-400 text-xs">
                      {stats.users.active} active (7d)
                    </div>
                  </div>

                  <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
                    <div className="flex items-center justify-between mb-2">
                      <Award className="w-8 h-8 text-[#FF9500]" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {(stats.points.total / 100).toFixed(0)}
                    </div>
                    <div className="text-white/50 text-sm">Total KCODE Distributed</div>
                  </div>

                  <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
                    <div className="flex items-center justify-between mb-2">
                      <Activity className="w-8 h-8 text-[#FF9500]" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {stats.activity.rituals.toLocaleString()}
                    </div>
                    <div className="text-white/50 text-sm">Daily Rituals</div>
                  </div>

                  <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
                    <div className="flex items-center justify-between mb-2">
                      <UserCheck className="w-8 h-8 text-[#FF9500]" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {stats.activity.referrals.toLocaleString()}
                    </div>
                    <div className="text-white/50 text-sm">Referrals</div>
                  </div>
                </div>

                {/* Activity Details */}
                <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
                  <h3 className="text-xl font-bold text-white mb-4">Activity Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-white/50 text-sm mb-2">Wheel Spins</div>
                      <div className="text-2xl font-bold text-white">
                        {stats.activity.spins.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50 text-sm mb-2">Active Rate</div>
                      <div className="text-2xl font-bold text-white">
                        {stats.users.total > 0 
                          ? ((stats.users.active / stats.users.total) * 100).toFixed(1)
                          : 0}%
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50 text-sm mb-2">Avg Points/User</div>
                      <div className="text-2xl font-bold text-white">
                        {stats.users.total > 0 
                          ? (stats.points.total / stats.users.total / 100).toFixed(2)
                          : 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
                  <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                  <div className="flex gap-4">
                    <a
                      href="/admin/tasks"
                      className="px-6 py-3 bg-[#FF9500] text-black font-bold hover:bg-[#FFB340] transition"
                    >
                      Manage Tasks →
                    </a>
                    <button
                      onClick={() => setActiveTab("users")}
                      className="px-6 py-3 border border-[#FF9500] text-[#FF9500] hover:bg-[#FF9500]/10 transition"
                    >
                      View Users →
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
                <p className="text-white/50">Failed to load statistics</p>
                <button
                  onClick={loadStats}
                  className="mt-4 px-4 py-2 bg-[#FF9500] text-black font-bold hover:bg-[#FFB340]"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <button
                onClick={loadUsers}
                disabled={loadingUsers}
                className="px-4 py-2 bg-[#FF9500] text-black font-bold hover:bg-[#FFB340] disabled:opacity-50"
              >
                {loadingUsers ? "Loading..." : "Refresh"}
              </button>
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF9500]" />
                <span className="ml-3 text-white/50">Loading users...</span>
              </div>
            ) : users.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-white/50 text-sm">
                    Total: {users.length} users | Active (7d): {users.filter(u => u.is_active).length}
                  </div>
                  <div className="text-white/40 text-xs">
                    Click column headers to sort
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#FF9500]/30">
                        <th className="text-left py-3 px-4">
                          <button
                            onClick={() => handleSort("created_at")}
                            className="flex items-center gap-2 text-white/70 hover:text-white font-semibold transition"
                          >
                            Wallet
                            {sortBy === "created_at" && (
                              sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            )}
                          </button>
                        </th>
                        <th className="text-left py-3 px-4">
                          <button
                            onClick={() => handleSort("twitter_username")}
                            className="flex items-center gap-2 text-white/70 hover:text-white font-semibold transition"
                          >
                            Twitter
                            {sortBy === "twitter_username" && (
                              sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            )}
                          </button>
                        </th>
                        <th className="text-left py-3 px-4">
                          <button
                            onClick={() => handleSort("telegram_username")}
                            className="flex items-center gap-2 text-white/70 hover:text-white font-semibold transition"
                          >
                            Telegram
                            {sortBy === "telegram_username" && (
                              sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            )}
                          </button>
                        </th>
                        <th className="text-right py-3 px-4">
                          <button
                            onClick={() => handleSort("total_points")}
                            className="flex items-center gap-2 ml-auto text-white/70 hover:text-white font-semibold transition"
                          >
                            Points
                            {sortBy === "total_points" && (
                              sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            )}
                          </button>
                        </th>
                        <th className="text-right py-3 px-4">
                          <button
                            onClick={() => handleSort("tasks_completed")}
                            className="flex items-center gap-2 ml-auto text-white/70 hover:text-white font-semibold transition"
                          >
                            Tasks
                            {sortBy === "tasks_completed" && (
                              sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            )}
                          </button>
                        </th>
                        <th className="text-right py-3 px-4">
                          <button
                            onClick={() => handleSort("wheel_spins")}
                            className="flex items-center gap-2 ml-auto text-white/70 hover:text-white font-semibold transition"
                          >
                            Spins
                            {sortBy === "wheel_spins" && (
                              sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            )}
                          </button>
                        </th>
                        <th className="text-right py-3 px-4">
                          <button
                            onClick={() => handleSort("referrals_count")}
                            className="flex items-center gap-2 ml-auto text-white/70 hover:text-white font-semibold transition"
                          >
                            Referrals
                            {sortBy === "referrals_count" && (
                              sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            )}
                          </button>
                        </th>
                        <th className="text-right py-3 px-4">
                          <button
                            onClick={() => handleSort("ritual_streak")}
                            className="flex items-center gap-2 ml-auto text-white/70 hover:text-white font-semibold transition"
                          >
                            Streak
                            {sortBy === "ritual_streak" && (
                              sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            )}
                          </button>
                        </th>
                        <th className="text-center py-3 px-4">
                          <button
                            onClick={() => handleSort("is_active")}
                            className="flex items-center gap-2 mx-auto text-white/70 hover:text-white font-semibold transition"
                          >
                            Status
                            {sortBy === "is_active" && (
                              sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            )}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers.map((user) => (
                        <tr key={user.id} className="border-b border-[#FF9500]/10 hover:bg-[#FF9500]/5">
                          <td className="py-3 px-4">
                            <div className="font-mono text-sm text-white">
                              {formatAddress(user.wallet_address)}
                            </div>
                            <div className="text-xs text-white/40 mt-1">
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {user.twitter_username ? (
                              <span className="text-[#1DA1F2]">@{user.twitter_username}</span>
                            ) : (
                              <span className="text-white/30">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {user.telegram_username ? (
                              <span className="text-[#0088cc]">@{user.telegram_username}</span>
                            ) : (
                              <span className="text-white/30">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="text-green-400 font-semibold">
                              {(user.total_points / 100).toFixed(2)}
                            </div>
                            <div className="text-xs text-white/40">
                              {(user.points_from_tasks / 100).toFixed(2)} from tasks
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-white">
                            {user.tasks_completed}
                          </td>
                          <td className="py-3 px-4 text-right text-white">
                            {user.wheel_spins}
                          </td>
                          <td className="py-3 px-4 text-right text-white">
                            {user.referrals_count}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={user.ritual_streak > 0 ? "text-[#FF9500] font-semibold" : "text-white/30"}>
                              {user.ritual_streak}🔥
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {user.is_active ? (
                              <span className="inline-block px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                                Active
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 bg-white/10 text-white/40 text-xs rounded">
                                Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-white/50">
                No users found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
