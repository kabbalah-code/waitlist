import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getUserByWallet } from '@/lib/db/users';

export async function GET(request: NextRequest) {
  try {
    // Get wallet address from headers (set by middleware)
    const walletAddress = request.headers.get("x-wallet-address");
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Unauthorized. Please authenticate first.' },
        { status: 401 }
      );
    }

    // Use service role client
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user
    const user = await getUserByWallet(walletAddress);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if completed today
    const today = new Date().toISOString().split('T')[0];
    const { data: meditation, error: meditationError } = await supabase
      .from('daily_meditations')
      .select('*')
      .eq('user_id', user.id)
      .gte('completed_at', `${today}T00:00:00`)
      .maybeSingle();

    if (meditationError) {
      console.error('[Meditation] Error checking status:', meditationError);
      // If table doesn't exist, return false
      if (meditationError.message.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          meditation: null,
          hasCompletedToday: false,
        });
      }
      throw meditationError;
    }

    return NextResponse.json({
      success: true,
      meditation: meditation || null,
      hasCompletedToday: !!meditation,
    });

  } catch (error) {
    console.error('[Meditation] Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
