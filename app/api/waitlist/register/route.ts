import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, checkVelocity } from '@/lib/rate-limiter';
import { getEmailAnalysis } from '@/lib/email-validator';
import { getDeviceScore } from '@/lib/device-info';

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      walletAddress,
      twitterHandle,
      referredBy,
      turnstileToken,
      fingerprint,
      deviceInfo,
      detailedFingerprint
    } = await request.json();

    // Get IP address and user agent for anti-sybil tracking
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log IP detection for debugging
    if (ipAddress === 'unknown') {
      console.warn('[WAITLIST] IP address is unknown. Check proxy headers configuration in production.');
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // 1. Email validation
    const emailAnalysis = getEmailAnalysis(email);
    if (!emailAnalysis.isValid) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    if (emailAnalysis.isDisposable) {
      return NextResponse.json(
        { error: 'Disposable email addresses are not allowed. Please use a permanent email.' },
        { status: 400 }
      );
    }
    
    if (emailAnalysis.score < 40) {
      return NextResponse.json(
        { error: 'Email address appears suspicious. Please use a different email.' },
        { status: 400 }
      );
    }

    // 2. Rate limiting
    const rateLimit = await checkRateLimit(ipAddress, fingerprint, email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: rateLimit.reason,
          retryAfter: rateLimit.retryAfter
        },
        { status: 429 }
      );
    }

    // 3. Velocity check
    const velocity = await checkVelocity(ipAddress);
    if (velocity.isBot) {
      return NextResponse.json(
        { error: 'Suspicious activity detected. Please try again later.' },
        { status: 429 }
      );
    }

    // 4. Calculate device score
    const deviceScore = getDeviceScore(deviceInfo);

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!turnstileToken) {
      return NextResponse.json(
        { error: 'Captcha verification required' },
        { status: 400 }
      );
    }

    // Verify Turnstile token
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret && turnstileToken !== 'dev-bypass-token') {
      const turnstileResponse = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            secret: turnstileSecret,
            response: turnstileToken,
          }),
        }
      );

      const turnstileData = await turnstileResponse.json();

      if (!turnstileData.success) {
        console.error('Turnstile verification failed:', turnstileData);
        return NextResponse.json(
          { error: 'Captcha verification failed. Please try again.' },
          { status: 400 }
        );
      }
    } else if (!turnstileSecret && turnstileToken === 'dev-bypass-token') {
      console.log('Development mode: Bypassing Turnstile verification');
    }

    const supabase = await createClient();

    // Check if already registered (by wallet or email)
    const { data: existing, error: checkError } = await supabase
      .from('waitlist_registrations')
      .select('id, referral_code, position, email, wallet_address')
      .or(`email.eq.${email},wallet_address.eq.${walletAddress}`)
      .single();

    // If table doesn't exist, return helpful error
    if (checkError && checkError.code === '42P01') {
      console.error('Waitlist table does not exist');
      return NextResponse.json(
        { error: 'Waitlist system not configured. Please contact support.' },
        { status: 503 }
      );
    }

    if (existing) {
      // Check if it's the same user or different
      const isSameUser = existing.email === email && existing.wallet_address === walletAddress;
      
      if (!isSameUser) {
        if (existing.email === email) {
          return NextResponse.json(
            { error: 'This email is already registered with a different wallet' },
            { status: 400 }
          );
        }
        if (existing.wallet_address === walletAddress) {
          return NextResponse.json(
            { error: 'This wallet is already registered with a different email' },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json({
        success: true,
        alreadyRegistered: true,
        data: existing
      });
    }

    // Validate referral code if provided
    if (referredBy) {
      const { data: referrer } = await supabase
        .from('waitlist_registrations')
        .select('referral_code')
        .eq('referral_code', referredBy)
        .single();

      if (!referrer) {
        return NextResponse.json(
          { error: 'Invalid referral code' },
          { status: 400 }
        );
      }
    }

    // Insert registration with anti-sybil data
    const { data, error } = await supabase
      .from('waitlist_registrations')
      .insert({
        email,
        wallet_address: walletAddress,
        twitter_handle: twitterHandle || null,
        referred_by: referredBy || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        browser_fingerprint: fingerprint || 'unknown',
        device_info: deviceInfo,
        detailed_fingerprint: detailedFingerprint,
        email_score: emailAnalysis.score,
        is_disposable_email: emailAnalysis.isDisposable,
        device_score: deviceScore,
        registration_source: 'web'
      })
      .select('id, email, wallet_address, referral_code, "position", created_at')
      .single();

    if (error) {
      console.error('Waitlist registration error:', error);
      
      // Specific error messages
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Email or wallet already registered' },
          { status: 400 }
        );
      }
      
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Waitlist system not configured. Please contact support.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }

    // Update positions
    await supabase.rpc('update_waitlist_positions');

    // Get updated data with position, referral_count, and points
    const { data: updated } = await supabase
      .from('waitlist_registrations')
      .select('"position", referral_count, points')
      .eq('id', data.id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        position: updated?.position || data.position,
        referral_count: updated?.referral_count || 0,
        points: updated?.points || 0
      }
    });

  } catch (error) {
    console.error('Waitlist registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
