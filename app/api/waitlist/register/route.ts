import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, walletAddress, twitterHandle, referredBy, turnstileToken } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

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
    if (turnstileSecret) {
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

    // Insert registration
    const { data, error } = await supabase
      .from('waitlist_registrations')
      .insert({
        email,
        wallet_address: walletAddress, // Now required
        twitter_handle: twitterHandle || null,
        referred_by: referredBy || null
      })
      .select('id, email, wallet_address, referral_code, position, created_at')
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

    // Get updated data with position and referral_count
    const { data: updated } = await supabase
      .from('waitlist_registrations')
      .select('position, referral_count')
      .eq('id', data.id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        position: updated?.position || data.position,
        referral_count: updated?.referral_count || 0
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
