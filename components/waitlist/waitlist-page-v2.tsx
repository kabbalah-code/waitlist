'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletConnectButton } from '@/components/web3/WalletConnectButton';

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
        {/* Success state - same as before */}
        <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                You're In!
              </span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">Position #{userStats.position}</p>
          </div>
        </div>
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
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-2xl mx-auto">
          {/* Header - No Logo */}
          <div className="text-center mb-8 md:mb-12">
            <div className="mb-6 md:mb-8">
              <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold mb-3 md:mb-4">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent animate-pulse">
                  Kabbalah Code
                </span>
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl text-gray-400">
                Where Ancient Wisdom Meets Blockchain
              </p>
            </div>

            {/* Mystical Divider */}
            <div className="flex items-center justify-center gap-4 md:gap-6 my-6 md:my-8">
              <div className="h-px w-16 md:w-24 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
              <div className="relative">
                <div className="absolute inset-0 bg-purple-600/50 blur-xl" />
                <span className="relative text-3xl md:text-4xl">✨</span>
              </div>
              <div className="h-px w-16 md:w-24 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
            </div>
          </div>

          {/* Registration Card */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-2xl" />
            <div className="relative bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 md:p-12">
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Begin Your Mystical Journey
                </h2>
                <p className="text-gray-400 text-base md:text-lg">
                  Join the mystical waitlist and unlock exclusive rewards
                </p>
              </div>

              <div className="space-y-4 md:space-y-6">
                <Input
                  type="email"
                  placeholder="Your Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black/50 border-purple-500/30 text-white placeholder:text-gray-500 h-12 md:h-14 text-base md:text-lg"
                />

                <div>
                  <Input
                    type="text"
                    placeholder="Twitter Handle (optional)"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                    className="bg-black/50 border-purple-500/30 text-white placeholder:text-gray-500 h-12 md:h-14 text-base md:text-lg"
                  />
                  <p className="text-xs text-white/50 mt-2 flex items-center gap-1">
                    <span>💡</span>
                    <span>Add Twitter to unlock Daily Ritual (1-3 $KCODE/day) after launch</span>
                  </p>
                </div>

                {!isConnected ? (
                  <div className="space-y-3">
                    <WalletConnectButton />
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
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-base md:text-lg py-5 md:py-7 text-white font-semibold"
                >
                  {loading ? 'Entering the Portal...' : '✨ Enter the Mystical Realm ✨'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
