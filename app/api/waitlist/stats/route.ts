import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const referralCode = searchParams.get('referralCode');
    const walletAddress = searchParams.get('walletAddress');

    const supabase = await createClient();

    // Get total registrations
    const { count: totalRegistrations } = await supabase
      .from('waitlist_registrations')
      .select('*', { count: 'exact', head: true });

    // If email, referral code, or wallet address provided, get user stats
    let userStats = null;
    if (email || referralCode || walletAddress) {
      const query = supabase
        .from('waitlist_registrations')
        .select('id, email, wallet_address, "position", referral_code, referral_count, points, bonus_kcode, created_at');

      if (email) {
        query.eq('email', email);
      } else if (referralCode) {
        query.eq('referral_code', referralCode);
      } else if (walletAddress) {
        query.eq('wallet_address', walletAddress);
      }

      const { data } = await query.single();
      userStats = data;
    }

    return NextResponse.json({
      success: true,
      totalRegistrations: totalRegistrations || 0,
      userStats
    });

  } catch (error) {
    console.error('Waitlist stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
