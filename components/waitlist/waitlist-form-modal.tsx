'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

declare global {
  interface Window {
    turnstile?: {
      render: (element: string | HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface WaitlistFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode?: string;
}

export function WaitlistFormModal({ isOpen, onClose, referralCode: propReferralCode }: WaitlistFormModalProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [referralCode, setReferralCode] = useState(propReferralCode || '');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (propReferralCode) {
      setReferralCode(propReferralCode);
    }
  }, [propReferralCode]);

  // Load Turnstile script
  useEffect(() => {
    if (!isOpen) return;

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
          callback: (token: string) => {
            setTurnstileToken(token);
          },
          'error-callback': () => {
            showToast('Captcha verification failed. Please try again.', 'error');
            setTurnstileToken(null);
          },
          theme: 'dark',
        });
      }
    };

    return () => {
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      document.body.removeChild(script);
    };
  }, [isOpen, showToast]);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      showToast('Please install MetaMask or another Web3 wallet', 'error');
      return;
    }

    setConnectingWallet(true);
    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        showToast('Wallet connected successfully', 'success');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      showToast('Failed to connect wallet', 'error');
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleRegister = async () => {
    if (!email) {
      showToast('Please enter your email', 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    if (!walletAddress) {
      showToast('Please connect your wallet first', 'error');
      return;
    }

    if (!turnstileToken) {
      showToast('Please complete the captcha verification', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/waitlist/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          walletAddress: walletAddress,
          twitterHandle: twitterHandle.replace('@', ''),
          referredBy: referralCode || null,
          turnstileToken
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        showToast(data.error || 'Registration failed. Please try again.', 'error');
        return;
      }
      
      if (data.success) {
        setRegistered(true);
        setUserStats(data.data);
        showToast('Successfully joined the waitlist!', 'success');
      } else {
        showToast(data.error || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showToast('Network error. Please check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${userStats.referral_code}`;
    navigator.clipboard.writeText(link);
    showToast('Referral link copied to clipboard!', 'success');
  };

  if (!isOpen) return null;

  if (registered && userStats) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
        <div className="relative w-full max-w-2xl max-h-[90vh]">
          <div className="relative bg-gradient-to-br from-black/80 to-gray-900/80 backdrop-blur-xl border-2 border-[#FF9500]/50 rounded-2xl p-8 max-h-[90vh] overflow-y-auto">
            {/* Decorative corners */}
            <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-[#FF9500]/70" />
            <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-[#FF9500]/70" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-[#FF9500]/70" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-[#FF9500]/70" />
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-white/70 hover:text-[#FF9500] transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Success Content */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#FF9500] to-orange-500 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-3xl font-bold mb-2 text-[#FF9500] font-serif">
                Welcome to the Waitlist!
              </h2>
              <p className="text-white/70 mb-6">
                You're in position <span className="text-4xl font-bold text-[#FF9500]">#{userStats.position || '...'}</span>
              </p>
            </div>

            {/* Stats */}
            <div className="mb-8">
              <div className="bg-black/30 border-2 border-[#FF9500]/30 rounded-xl p-6 text-center">
                <div className="text-5xl font-bold text-[#FF9500] mb-2">{userStats.referral_count || 0}</div>
                <div className="text-lg text-white/70">Referrals</div>
              </div>
            </div>

            {/* Referral Link */}
            <div className="bg-black/30 border-2 border-[#FF9500]/30 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-bold mb-3 text-white font-serif">Share & Earn</h3>
              <p className="text-sm text-white/70 mb-4">
                Earn <span className="text-[#FF9500] font-bold">$KCODE</span> for each friend who joins!
              </p>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}?ref=${userStats.referral_code}`}
                  readOnly
                  className="bg-black/50 border-[#FF9500]/30 text-white text-sm"
                />
                <Button
                  onClick={copyReferralLink}
                  className="bg-gradient-to-r from-[#FF9500] to-orange-500 hover:from-[#FF9500]/80 hover:to-orange-400 text-black font-bold"
                >
                  Copy
                </Button>
              </div>
            </div>

            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-[#FF9500] to-orange-500 hover:from-[#FF9500]/80 hover:to-orange-400 text-black font-bold"
            >
              Continue Exploring
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-lg">
        <div className="relative bg-gradient-to-br from-black/80 to-gray-900/80 backdrop-blur-xl border-2 border-[#FF9500]/50 rounded-2xl p-8">
          {/* Decorative corners */}
          <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-[#FF9500]/70" />
          <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-[#FF9500]/70" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-[#FF9500]/70" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-[#FF9500]/70" />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-white/70 hover:text-[#FF9500] transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3 text-[#FF9500] font-serif">
              Join the Waitlist
            </h2>
            <p className="text-white/70">
              Be among the first to experience the mystical journey
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Your Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/50 border-[#FF9500]/30 text-white placeholder:text-gray-500 h-12"
              />
            </div>

            <div>
              <Input
                type="text"
                placeholder="Twitter Handle (optional)"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
                className="bg-black/50 border-[#FF9500]/30 text-white placeholder:text-gray-500 h-12"
              />
            </div>

            {referralCode && (
              <div className="bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-lg p-3 text-sm">
                <span className="text-white/70">Referred by:</span>{' '}
                <span className="font-mono text-[#FF9500]">{referralCode}</span>
              </div>
            )}

            {!walletAddress ? (
              <div className="space-y-2">
                <Button
                  onClick={connectWallet}
                  disabled={connectingWallet}
                  className="w-full bg-gradient-to-r from-[#FF9500] to-orange-500 hover:from-[#FF9500]/80 hover:to-orange-400 h-12 text-black font-bold"
                >
                  {connectingWallet ? 'Connecting...' : 'Connect Wallet (Required)'}
                </Button>
                <p className="text-xs text-white/50 text-center">
                  Wallet connection required to prevent spam
                </p>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm">
                <span className="text-white/70">Wallet:</span>{' '}
                <span className="font-mono text-green-400">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            )}

            {/* Cloudflare Turnstile Captcha */}
            <div className="flex justify-center">
              <div ref={turnstileRef} />
            </div>

            <Button
              onClick={handleRegister}
              disabled={loading || !email || !walletAddress || !turnstileToken}
              className="w-full bg-gradient-to-r from-[#FF9500] to-orange-500 hover:from-[#FF9500]/80 hover:to-orange-400 h-12 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Joining...
                </span>
              ) : (
                'Join Waitlist'
              )}
            </Button>
          </div>

          {/* Benefits */}
          <div className="mt-8 pt-6 border-t border-[#FF9500]/20">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl mb-1">🔐</div>
                <div className="text-xs text-white/70">Wallet Required</div>
              </div>
              <div>
                <div className="text-2xl mb-1">💎</div>
                <div className="text-xs text-white/70">Bonus $KCODE</div>
              </div>
              <div>
                <div className="text-2xl mb-1">🌟</div>
                <div className="text-xs text-white/70">Free NFT</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
