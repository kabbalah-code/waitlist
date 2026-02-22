'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useAppKit } from '@reown/appkit/react';
import { useAccount, useDisconnect } from 'wagmi';
import { getBrowserFingerprint, getDetailedFingerprint } from '@/lib/fingerprint';
import { getDeviceInfo } from '@/lib/device-info';

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
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  const [email, setEmail] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [referralCode, setReferralCode] = useState(propReferralCode || '');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [fingerprintLoading, setFingerprintLoading] = useState(true);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (propReferralCode) {
      setReferralCode(propReferralCode);
    }
  }, [propReferralCode]);

  // Get browser fingerprint on mount
  useEffect(() => {
    if (isOpen) {
      setFingerprintLoading(true);
      getBrowserFingerprint().then(fp => {
        setFingerprint(fp);
        console.log('Browser fingerprint loaded:', fp);
      }).catch(err => {
        console.error('Failed to get fingerprint:', err);
        setFingerprint('unknown');
      }).finally(() => {
        setFingerprintLoading(false);
      });
    }
  }, [isOpen]);

  // Check if user is already registered
  useEffect(() => {
    if (!isOpen || !address) return;

    const checkRegistration = async () => {
      try {
        // Check localStorage first
        const savedRegistration = localStorage.getItem('waitlist_registration');
        if (savedRegistration) {
          const data = JSON.parse(savedRegistration);
          if (data.wallet_address === address) {
            setRegistered(true);
            setUserStats(data);
            return;
          }
        }

        // Check with API
        const res = await fetch(`/api/waitlist/stats?walletAddress=${address}`);
        if (res.ok) {
          const data = await res.json();
          if (data.userStats) {
            setRegistered(true);
            setUserStats(data.userStats);
            // Save to localStorage
            localStorage.setItem('waitlist_registration', JSON.stringify(data.userStats));
          }
        }
      } catch (error) {
        console.error('Error checking registration:', error);
      }
    };

    checkRegistration();
  }, [isOpen, address]);

  // Load Turnstile script
  useEffect(() => {
    if (!isOpen) return;

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    
    // Don't load Turnstile if site key is not configured
    if (!siteKey) {
      console.warn('Turnstile site key not configured');
      // Auto-set token to bypass captcha in development
      if (process.env.NODE_ENV === 'development') {
        setTurnstileToken('dev-bypass-token');
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: siteKey,
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
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          console.error('Error removing Turnstile widget:', e);
        }
        widgetIdRef.current = null;
      }
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, [isOpen, showToast]);

  const connectWallet = async () => {
    try {
      await open();
    } catch (error) {
      console.error('Wallet connection error:', error);
      showToast('Failed to connect wallet', 'error');
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

    if (!address) {
      showToast('Please connect your wallet first', 'error');
      return;
    }

    // Only require turnstile token if site key is configured
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      showToast('Please complete the captcha verification', 'error');
      return;
    }

    setLoading(true);
    try {
      // Get device info and detailed fingerprint
      const deviceInfo = getDeviceInfo();
      const detailedFp = await getDetailedFingerprint();
      
      const res = await fetch('/api/waitlist/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          walletAddress: address,
          twitterHandle: twitterHandle.replace('@', ''),
          referredBy: referralCode || null,
          turnstileToken,
          fingerprint,
          deviceInfo,
          detailedFingerprint: detailedFp
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
        // Save to localStorage
        localStorage.setItem('waitlist_registration', JSON.stringify(data.data));
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
              <p className="text-xs text-white/50 mt-1 flex items-center gap-1">
                <span>💡</span>
                <span>Add Twitter to unlock Daily Ritual (1-3 $KCODE/day) after launch</span>
              </p>
            </div>

            {referralCode && (
              <div className="bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-lg p-3 text-sm">
                <span className="text-white/70">Referred by:</span>{' '}
                <span className="font-mono text-[#FF9500]">{referralCode}</span>
              </div>
            )}

            {!isConnected ? (
              <div className="space-y-2">
                <Button
                  onClick={connectWallet}
                  className="w-full bg-gradient-to-r from-[#FF9500] to-orange-500 hover:from-[#FF9500]/80 hover:to-orange-400 h-12 text-black font-bold"
                >
                  Connect Wallet (Required)
                </Button>
                <p className="text-xs text-white/50 text-center">
                  Wallet connection required to prevent spam
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm">
                  <span className="text-white/70">Wallet:</span>{' '}
                  <span className="font-mono text-green-400">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <Button
                  onClick={() => disconnect()}
                  variant="outline"
                  className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10"
                >
                  Disconnect
                </Button>
              </div>
            )}

            {/* Cloudflare Turnstile Captcha */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <div className="flex justify-center">
                <div ref={turnstileRef} />
              </div>
            )}

            <Button
              onClick={handleRegister}
              disabled={loading || fingerprintLoading || !email || !isConnected || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken)}
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
              ) : fingerprintLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
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
