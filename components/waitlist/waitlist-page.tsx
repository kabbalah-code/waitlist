'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletConnectButton } from '@/components/web3/WalletConnectButton';

export default function WaitlistPage() {
  const { address, isConnected } = useAccount();
  const [email, setEmail] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [totalRegistrations, setTotalRegistrations] = useState(0);

  useEffect(() => {
    // Get referral code from URL
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
    }
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
        
        // Fetch total stats
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
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-black text-white overflow-hidden relative">
        {/* Mystical Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            {/* Success Icon */}
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Welcome to the Waitlist
            </h1>

            <p className="text-xl text-gray-300">
              You're in position <span className="text-3xl font-bold text-purple-400">#{userStats.position}</span>
            </p>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <div className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
                <div className="text-3xl font-bold text-purple-400">{userStats.referral_count}</div>
                <div className="text-sm text-gray-400 mt-1">Referrals</div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
                <div className="text-3xl font-bold text-indigo-400">{userStats.bonus_kcode}</div>
                <div className="text-sm text-gray-400 mt-1">Bonus KCODE</div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
                <div className="text-3xl font-bold text-purple-400">{totalRegistrations}</div>
                <div className="text-sm text-gray-400 mt-1">Total Registered</div>
              </div>
            </div>

            {/* Referral Section */}
            <div className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-lg p-8 mt-8">
              <h3 className="text-2xl font-bold mb-4">Earn More KCODE</h3>
              <p className="text-gray-300 mb-6">
                Share your referral link and earn <span className="text-purple-400 font-bold">100 KCODE</span> for each friend who joins!
              </p>
              
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}?ref=${userStats.referral_code}`}
                  readOnly
                  className="bg-black/30 border-purple-500/30 text-white"
                />
                <Button
                  onClick={copyReferralLink}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  Copy
                </Button>
              </div>
            </div>

            {/* Galxe Campaign Preview */}
            <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-sm border border-purple-500/20 rounded-lg p-8 mt-8">
              <h3 className="text-2xl font-bold mb-4">🎁 Boost Your Position</h3>
              <p className="text-gray-300 mb-6">Complete tasks to move up the waitlist and earn extra rewards!</p>
              
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="text-2xl">🐦</span>
                  <span>Follow us on Twitter</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="text-2xl">✈️</span>
                  <span>Join Telegram Channel</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="text-2xl">💬</span>
                  <span>Join Telegram Chat</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="text-2xl">🎨</span>
                  <span>Mint Free Testnet NFT Pass</span>
                </div>
              </div>
              
              <Button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                Coming Soon on Galxe
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-indigo-950 to-black text-white overflow-hidden relative">
      {/* Animated Mystical Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Sacred Geometry Pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="sacred" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sacred)" />
        </svg>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Logo/Title */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent animate-pulse">
              Kabbalah Code
            </h1>
            <p className="text-xl md:text-2xl text-gray-300">
              Unlock the Mysteries of the Universe
            </p>
          </div>

          {/* Mystical Divider */}
          <div className="flex items-center justify-center gap-4 my-8">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-purple-500" />
            <span className="text-3xl">✨</span>
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-purple-500" />
          </div>

          {/* Registration Form */}
          <div className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-lg p-8 space-y-6">
            <h2 className="text-3xl font-bold">Join the Waitlist</h2>
            <p className="text-gray-300">
              Be among the first to experience the mystical journey. Early members receive exclusive KCODE token rewards.
            </p>

            <div className="space-y-4">
              <Input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/30 border-purple-500/30 text-white placeholder:text-gray-500"
              />

              <Input
                type="text"
                placeholder="Twitter Handle (optional)"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
                className="bg-black/30 border-purple-500/30 text-white placeholder:text-gray-500"
              />

              {referralCode && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-sm">
                  🎁 Referred by: <span className="font-mono text-purple-400">{referralCode}</span>
                </div>
              )}

              {!isConnected && (
                <div className="pt-2">
                  <WalletConnectButton />
                  <p className="text-xs text-gray-400 mt-2">Optional: Connect wallet for extra benefits</p>
                </div>
              )}

              {isConnected && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm">
                  ✅ Wallet Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              )}

              <Button
                onClick={handleRegister}
                disabled={loading || !email}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg py-6"
              >
                {loading ? 'Joining...' : 'Join Waitlist'}
              </Button>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-4 mt-12">
            <div className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
              <div className="text-4xl mb-3">🎁</div>
              <h3 className="font-bold mb-2">Early Access</h3>
              <p className="text-sm text-gray-400">Be first to explore the mystical platform</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
              <div className="text-4xl mb-3">💎</div>
              <h3 className="font-bold mb-2">Bonus KCODE</h3>
              <p className="text-sm text-gray-400">Earn 100 KCODE per referral</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
              <div className="text-4xl mb-3">🌟</div>
              <h3 className="font-bold mb-2">Exclusive NFTs</h3>
              <p className="text-sm text-gray-400">Free testnet NFT pass for early members</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
