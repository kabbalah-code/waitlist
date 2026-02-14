'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletConnect } from '@/components/WalletConnect';

export default function WaitlistPageV2() {
  const { address, isConnected } = useAccount();
  const [email, setEmail] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [totalRegistrations, setTotalRegistrations] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setReferralCode(ref);
  }, []);

  useEffect(() => {
    if (registered && userStats?.referral_code) {
      fetchStats();
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
    }
  }, [registered, userStats]);

  const fetchStats = async () => {
    if (!userStats?.referral_code) return;
    const res = await fetch(`/api/waitlist/stats?referralCode=${userStats.referral_code}`);
    const data = await res.json();
    if (data.success) {
      setTotalRegistrations(data.totalRegistrations);
      setUserStats(data.userStats);
    }
  };

  const handleRegister = async () => {
    if (!email) {
      alert('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/waitlist/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          walletAddress: address,
          twitterHandle: twitterHandle.replace('@', ''),
          referredBy: referralCode || null
        })
      });

      const data = await res.json();
      if (data.success) {
        setRegistered(true);
        setUserStats(data.data);
        const statsRes = await fetch('/api/waitlist/stats');
        const statsData = await statsRes.json();
        if (statsData.success) {
          setTotalRegistrations(statsData.totalRegistrations);
        }
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${userStats.referral_code}`;
    navigator.clipboard.writeText(link);
    alert('Referral link copied!');
  };

  if (registered && userStats) {
    return (
      <div className="min-h-screen bg-black text-white overflow-hidden relative">
        {/* Animated Cosmic Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-black to-black" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-pink-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-400/50 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>

        <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-block mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 blur-xl opacity-50 animate-pulse" />
                  <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 rounded-full flex items-center justify-center border-4 border-purple-400/30">
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                  You're In
                </span>
              </h1>
              
              <p className="text-gray-400 text-lg mb-8">
                Your mystical journey begins soon
              </p>

              {/* Position Badge */}
              <div className="inline-block">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-600/20 blur-2xl" />
                  <div className="relative bg-gradient-to-r from-purple-900/50 to-indigo-900/50 backdrop-blur-xl border border-purple-500/30 rounded-2xl px-8 py-6">
                    <div className="text-sm text-gray-400 mb-2">Your Position</div>
                    <div className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      #{userStats.position}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-gradient-to-br from-purple-900/30 to-black/30 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 hover:border-purple-500/40 transition-all">
                  <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                    {userStats.referral_count}
                  </div>
                  <div className="text-gray-400 text-sm">Mystical Referrals</div>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-gradient-to-br from-indigo-900/30 to-black/30 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6 hover:border-indigo-500/40 transition-all">
                  <div className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                    {userStats.bonus_kcode}
                  </div>
                  <div className="text-gray-400 text-sm">Bonus KCODE</div>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 to-purple-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-gradient-to-br from-pink-900/30 to-black/30 backdrop-blur-xl border border-pink-500/20 rounded-2xl p-6 hover:border-pink-500/40 transition-all">
                  <div className="text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                    {totalRegistrations}
                  </div>
                  <div className="text-gray-400 text-sm">Total Seekers</div>
                </div>
              </div>
            </div>

            {/* Referral Section */}
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 blur-2xl" />
              <div className="relative bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8">
                <div className="text-center mb-6">
                  <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Spread the Mystical Energy
                  </h3>
                  <p className="text-gray-400">
                    Share your unique portal and earn <span className="text-purple-400 font-bold">100 KCODE</span> for each seeker who joins
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <Input
                    value={`${window.location.origin}?ref=${userStats.referral_code}`}
                    readOnly
                    className="flex-1 bg-black/50 border-purple-500/30 text-white font-mono text-sm"
                  />
                  <Button
                    onClick={copyReferralLink}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Portal
                  </Button>
                </div>
              </div>
            </div>

            {/* Galxe Campaign */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 blur-2xl" />
              <div className="relative bg-gradient-to-br from-indigo-900/20 to-purple-900/20 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-8">
                <div className="text-center mb-8">
                  <div className="text-5xl mb-4">🎁</div>
                  <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Ascend the Ranks
                  </h3>
                  <p className="text-gray-400">
                    Complete sacred tasks to climb higher and unlock mystical rewards
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-black/30 border border-purple-500/20 rounded-xl p-4 flex items-center gap-4 hover:border-purple-500/40 transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-2xl">
                      🐦
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">Follow on Twitter</div>
                      <div className="text-sm text-gray-400">Join the mystical community</div>
                    </div>
                  </div>

                  <div className="bg-black/30 border border-purple-500/20 rounded-xl p-4 flex items-center gap-4 hover:border-purple-500/40 transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-2xl">
                      ✈️
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">Telegram Channel</div>
                      <div className="text-sm text-gray-400">Receive sacred updates</div>
                    </div>
                  </div>

                  <div className="bg-black/30 border border-purple-500/20 rounded-xl p-4 flex items-center gap-4 hover:border-purple-500/40 transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl">
                      💬
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">Telegram Chat</div>
                      <div className="text-sm text-gray-400">Connect with seekers</div>
                    </div>
                  </div>

                  <div className="bg-black/30 border border-purple-500/20 rounded-xl p-4 flex items-center gap-4 hover:border-purple-500/40 transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-2xl">
                      🎨
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">Mint NFT Pass</div>
                      <div className="text-sm text-gray-400">Free testnet access</div>
                    </div>
                  </div>
                </div>

                <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-lg py-6">
                  <span className="mr-2">✨</span>
                  Coming Soon on Galxe
                  <span className="ml-2">✨</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0) translateX(0);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translateY(-100vh) translateX(50px);
              opacity: 0;
            }
          }
          .animate-float {
            animation: float linear infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Cosmic Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-black to-black" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-pink-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/50 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Sacred Geometry Overlay */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="sacred-geo" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="100" cy="100" r="20" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <path d="M100,40 L130,80 L115,120 L85,120 L70,80 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sacred-geo)" />
        </svg>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="mb-8">
              <h1 className="text-6xl md:text-8xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent animate-pulse">
                  Kabbalah Code
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-400">
                Where Ancient Wisdom Meets Blockchain
              </p>
            </div>

            {/* Mystical Divider */}
            <div className="flex items-center justify-center gap-6 my-8">
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
              <div className="relative">
                <div className="absolute inset-0 bg-purple-600/50 blur-xl" />
                <span className="relative text-4xl">✨</span>
              </div>
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
            </div>
          </div>

          {/* Registration Card */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-2xl" />
            <div className="relative bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 md:p-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Begin Your Journey
                </h2>
                <p className="text-gray-400 text-lg">
                  Join the mystical waitlist and unlock exclusive rewards
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <Input
                    type="email"
                    placeholder="Your Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-black/50 border-purple-500/30 text-white placeholder:text-gray-500 h-14 text-lg"
                  />
                </div>

                <div>
                  <Input
                    type="text"
                    placeholder="Twitter Handle (optional)"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                    className="bg-black/50 border-purple-500/30 text-white placeholder:text-gray-500 h-14 text-lg"
                  />
                </div>

                {referralCode && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-2xl">🎁</span>
                      <span className="text-gray-400">Referred by:</span>
                      <span className="font-mono text-purple-400 font-bold">{referralCode}</span>
                    </div>
                  </div>
                )}

                {!isConnected ? (
                  <div className="space-y-3">
                    <WalletConnect />
                    <p className="text-xs text-gray-500 text-center">
                      Optional: Connect wallet for additional benefits
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">✅</span>
                      <span className="text-gray-400">Wallet:</span>
                      <span className="font-mono text-green-400">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleRegister}
                  disabled={loading || !email}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg py-7 text-white font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Entering the Portal...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>✨</span>
                      Enter the Mystical Realm
                      <span>✨</span>
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-gradient-to-br from-purple-900/30 to-black/30 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 text-center hover:border-purple-500/40 transition-all">
                <div className="text-5xl mb-4">🎁</div>
                <h3 className="font-bold text-lg mb-2 text-white">Early Access</h3>
                <p className="text-sm text-gray-400">Be first to explore the mystical platform</p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-gradient-to-br from-indigo-900/30 to-black/30 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6 text-center hover:border-indigo-500/40 transition-all">
                <div className="text-5xl mb-4">💎</div>
                <h3 className="font-bold text-lg mb-2 text-white">Bonus KCODE</h3>
                <p className="text-sm text-gray-400">Earn 100 KCODE per referral</p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 to-purple-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-gradient-to-br from-pink-900/30 to-black/30 backdrop-blur-xl border border-pink-500/20 rounded-2xl p-6 text-center hover:border-pink-500/40 transition-all">
                <div className="text-5xl mb-4">🌟</div>
                <h3 className="font-bold text-lg mb-2 text-white">Exclusive NFTs</h3>
                <p className="text-sm text-gray-400">Free testnet NFT pass</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(50px);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}
