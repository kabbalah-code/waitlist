"use client"

import { formatAddress } from "@/lib/web3/ethereum"
import {
  User,
  Calendar,
  Flame,
  Trophy,
  Sparkles,
  Twitter,
  Send,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
} from "lucide-react"
import { useState } from "react"
import { TelegramBotConnect } from "./telegram-bot-connect"

interface UserData {
  id?: string
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
  referral_code: string
  created_at: string
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  tx_hash?: string  // New field for blockchain tracking
  created_at: string
}

interface ProfileTabProps {
  user: UserData
  transactions: Transaction[]
  referralCount: number
  onConnectTwitter?: () => void
  onConnectTelegram?: () => void
  onTelegramConnected?: (username: string) => void
}

export function ProfileTab({
  user,
  transactions,
  referralCount,
  onConnectTwitter,
  onConnectTelegram,
  onTelegramConnected,
}: ProfileTabProps) {
  const [copied, setCopied] = useState(false)
  const [showTelegramConnect, setShowTelegramConnect] = useState(false)

  const copyReferral = () => {
    navigator.clipboard.writeText(`${window.location.origin}?ref=${user.referral_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* Profile Header - removed progress bar, it's in Tree of Life */}
      <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-[#FF9500] flex items-center justify-center text-black text-3xl font-bold flex-shrink-0">
            {user.wallet_number}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white mb-1">Seeker #{user.wallet_number}</h2>
            <p className="text-white/50 font-mono text-sm truncate">{formatAddress(user.wallet_address)}</p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2 text-white/70">
                <Calendar size={16} className="text-[#FF9500]" />
                <span>Joined {memberSince}</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <User size={16} className="text-[#FF9500]" />
                <span>Level {user.level}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - added streak milestones */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-[#FF9500]/20 bg-[#0a0a0a] text-center">
          <Calendar className="w-6 h-6 text-[#FF9500] mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">
            {transactions.filter(tx => tx.type === 'daily_ritual').length}
          </p>
          <p className="text-white/50 text-xs uppercase">Rituals Done</p>
        </div>
        <div className="p-4 border border-[#FF9500]/20 bg-[#0a0a0a] text-center">
          <Flame className="w-6 h-6 text-[#FF9500] mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{user.current_streak}</p>
          <p className="text-white/50 text-xs uppercase">Current Streak</p>
          {/* Mini progress to next milestone */}
          <div className="mt-2">
            <div className="h-1 bg-black/50 overflow-hidden">
              <div
                className="h-full bg-[#FF9500]"
                style={{ width: `${Math.min(((user.current_streak % 7) / 7) * 100, 100)}%` }}
              />
            </div>
            <p className="text-white/30 text-[10px] mt-1">{7 - (user.current_streak % 7)} to bonus</p>
          </div>
        </div>
        <div className="p-4 border border-[#FF9500]/20 bg-[#0a0a0a] text-center">
          <Trophy className="w-6 h-6 text-[#FF9500] mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{user.longest_streak}</p>
          <p className="text-white/50 text-xs uppercase">Best Streak</p>
        </div>
        <div className="p-4 border border-[#FF9500]/20 bg-[#0a0a0a] text-center">
          <User className="w-6 h-6 text-[#FF9500] mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{referralCount}</p>
          <p className="text-white/50 text-xs uppercase">Referrals</p>
        </div>
      </div>

      {/* Connected Accounts - real connect buttons */}
      <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
        <h3 className="text-lg font-bold text-white mb-4">Connected Accounts</h3>
        <div className="space-y-3">
          {/* Twitter */}
          <div className="flex items-center justify-between p-3 bg-black/50 border border-[#FF9500]/10">
            <div className="flex items-center gap-3">
              <Twitter size={20} className={user.twitter_username ? "text-[#1DA1F2]" : "text-white/30"} />
              <span className={user.twitter_username ? "text-white" : "text-white/50"}>
                {user.twitter_username ? `@${user.twitter_username}` : "Not connected"}
              </span>
            </div>
            {user.twitter_username ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400">+10 KCODE</span>
                <Check size={18} className="text-green-500" />
              </div>
            ) : (
              <button
                onClick={onConnectTwitter}
                className="px-3 py-1 bg-[#1DA1F2] text-white text-sm font-bold hover:bg-[#1a8cd8] transition-colors flex items-center gap-1"
              >
                Connect <ExternalLink size={12} />
              </button>
            )}
          </div>

          {/* Telegram */}
          <div className="flex items-center justify-between p-3 bg-black/50 border border-[#FF9500]/10">
            <div className="flex items-center gap-3">
              <Send size={20} className={user.telegram_username ? "text-[#0088cc]" : "text-white/30"} />
              <span className={user.telegram_username ? "text-white" : "text-white/50"}>
                {user.telegram_username ? user.telegram_username : "Not connected"}
              </span>
            </div>
            {user.telegram_username ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400">+10 KCODE</span>
                <Check size={18} className="text-green-500" />
              </div>
            ) : (
              <button
                onClick={() => setShowTelegramConnect(true)}
                className="px-3 py-1 bg-[#0088cc] text-white text-sm font-bold hover:bg-[#0099dd] transition-colors flex items-center gap-1"
              >
                Connect <ExternalLink size={12} />
              </button>
            )}
          </div>

          {/* Discord */}
          <div className="flex items-center justify-between p-3 bg-black/50 border border-[#FF9500]/10">
            <div className="flex items-center gap-3">
              <MessageCircle size={20} className={user.discord_username ? "text-[#5865F2]" : "text-white/30"} />
              <span className={user.discord_username ? "text-white" : "text-white/50"}>
                {user.discord_username || "Not connected"}
              </span>
            </div>
            {user.discord_username ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400">+10 KCODE</span>
                <Check size={18} className="text-green-500" />
              </div>
            ) : (
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/auth/discord/oauth', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ walletAddress: user.wallet_address })
                    })
                    const data = await response.json()
                    if (data.success) {
                      window.location.href = data.authUrl
                    } else {
                      console.error('Discord OAuth error:', data.error)
                    }
                  } catch (error) {
                    console.error('Discord OAuth error:', error)
                  }
                }}
                className="px-3 py-1 bg-[#5865F2] text-white text-sm font-bold hover:bg-[#4752C4] transition-colors flex items-center gap-1"
              >
                Connect <ExternalLink size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
        <h3 className="text-lg font-bold text-white mb-4">Your Referral Link</h3>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={`${typeof window !== "undefined" ? window.location.origin : ""}?ref=${user.referral_code}`}
            className="flex-1 bg-black/50 border border-[#FF9500]/20 px-4 py-3 text-white/70 font-mono text-sm"
          />
          <button
            onClick={copyReferral}
            className="px-4 py-3 bg-[#FF9500] text-black hover:bg-[#FFB340] transition-colors"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>
        <p className="text-white/40 text-sm mt-3">Earn 5% / 3% / 1% of your referrals' KCODE rewards</p>
      </div>

      {/* Transaction History - Hidden to avoid duplication with TokenHistory component */}
      {false && (
      <div className="p-6 border border-[#FF9500]/30 bg-[#0a0a0a]">
        <h3 className="text-lg font-bold text-white mb-4">KCODE History</h3>
        {transactions.length === 0 ? (
          <p className="text-white/50 text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transactions.map((tx) => {
              // Convert points to KCODE for display (100 points = 1 KCODE)
              const kcodeAmount = tx.amount / 100
              
              // Smart formatting: integers without decimals, fractions with up to 2 decimals
              let displayAmount: string
              if (kcodeAmount === Math.floor(kcodeAmount)) {
                displayAmount = Math.abs(kcodeAmount).toString()
              } else {
                displayAmount = Math.abs(kcodeAmount).toFixed(2).replace(/\.?0+$/, '')
              }
              
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-black/30 border border-[#FF9500]/10">
                  <div>
                    <p className="text-white text-sm">{tx.description || tx.type}</p>
                    <p className="text-white/40 text-xs">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-bold ${tx.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {tx.amount >= 0 ? "+" : "-"}
                    {displayAmount} KCODE
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* Telegram Connect Modal */}
      {showTelegramConnect && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <TelegramBotConnect
              walletAddress={user.wallet_address}
              onConnected={(username) => {
                setShowTelegramConnect(false)
                if (onTelegramConnected) {
                  onTelegramConnected(username)
                }
              }}
              onClose={() => setShowTelegramConnect(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
