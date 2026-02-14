import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getUserByWallet, calculateLevel } from '@/lib/db/users';

export async function POST(request: NextRequest) {
  try {
    // Get userId and walletAddress from headers (set by middleware)
    const userId = request.headers.get("x-user-id");
    const walletAddress = request.headers.get("x-wallet-address");
    
    console.log('[Meditation] 🔍 Headers received:', {
      userId: userId?.slice(0, 8) + '...',
      walletAddress: walletAddress?.slice(0, 10) + '...',
      hasUserId: !!userId,
      hasWallet: !!walletAddress
    });
    
    if (!userId || !walletAddress) {
      console.error('[Meditation] ❌ Missing auth headers');
      return NextResponse.json(
        { error: 'Unauthorized. Please authenticate first.' },
        { status: 401 }
      );
    }

    const { meditationText } = await request.json();

    // Use service role client for database operations
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user by wallet address using the standard helper
    const user = await getUserByWallet(walletAddress);

    if (!user) {
      console.error('[Meditation] User not found:', { walletAddress });
      return NextResponse.json(
        { error: 'User not found. Please make sure you are logged in.' },
        { status: 404 }
      );
    }

    console.log('[Meditation] User found:', user.id);

    // Check if already completed today
    const today = new Date().toISOString().split('T')[0];
    
    let existingMeditation;
    try {
      const { data, error } = await supabase
        .from('daily_meditations')
        .select('id')
        .eq('user_id', user.id)
        .gte('completed_at', `${today}T00:00:00`)
        .maybeSingle();
      
      if (error) {
        console.error('[Meditation] Error checking existing meditation:', error);
        // If table doesn't exist, continue anyway
        if (!error.message.includes('does not exist')) {
          throw error;
        }
      }
      
      existingMeditation = data;
    } catch (checkError) {
      console.error('[Meditation] Failed to check existing meditation:', checkError);
      // Continue anyway - table might not exist yet
    }

    if (existingMeditation) {
      return NextResponse.json(
        { error: 'Meditation already completed today' },
        { status: 400 }
      );
    }

    // Award 1 KCODE
    const kcodeReward = 1;
    const newKcode = user.total_kcode + kcodeReward;
    const newLevel = calculateLevel(newKcode);
    const newTokensMinted = user.tokens_minted + kcodeReward;

    console.log('[Meditation] 💰 Awarding KCODE:', {
      currentKcode: user.total_kcode,
      reward: kcodeReward,
      newTotal: newKcode,
      newLevel,
      tokensMinted: newTokensMinted
    });

    // Update user KCODE, level, and tokens_minted
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        total_kcode: newKcode,
        level: newLevel,
        tokens_minted: newTokensMinted
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Meditation] ❌ Error updating user KCODE:', updateError);
      return NextResponse.json(
        { error: 'Failed to update KCODE' },
        { status: 500 }
      );
    }

    console.log('[Meditation] ✅ User KCODE updated successfully');

    // ✅ REWARD USER WITH KCODE TOKENS - Transfer from Community Reserve
    let txHash: string | undefined;
    try {
      const { rewardUserWithKcode } = await import('@/lib/web3/backend-contracts');
      txHash = await rewardUserWithKcode(
        user.wallet_address,
        kcodeReward,
        'Daily Meditation Reward'
      );
      console.log(`[Meditation] ✅ Rewarded ${kcodeReward} KCODE. TX: ${txHash}`);
    } catch (contractError) {
      console.error('[Meditation] ❌ Error rewarding KCODE:', contractError);
      // Rollback database update
      await supabase
        .from('users')
        .update({ 
          total_kcode: user.total_kcode, 
          level: user.level,
          tokens_minted: user.tokens_minted
        })
        .eq('id', user.id);
      
      return NextResponse.json(
        { success: false, error: 'Failed to transfer tokens from Community Reserve' },
        { status: 500 }
      );
    }

    // Record meditation completion
    const { error: meditationError } = await supabase
      .from('daily_meditations')
      .insert({
        user_id: user.id,
        meditation_text: meditationText,
        kcode_earned: kcodeReward,
        completed_at: new Date().toISOString(),
      });

    if (meditationError) {
      console.error('[Meditation] ❌ Error recording meditation:', meditationError);
      return NextResponse.json(
        { error: 'Failed to record meditation' },
        { status: 500 }
      );
    }

    console.log('[Meditation] ✅ Meditation recorded successfully');

    // Record transaction in blockchain_transactions with real tx hash
    const { error: txError } = await supabase
      .from('blockchain_transactions')
      .insert({
        user_id: user.id,
        wallet_address: user.wallet_address,
        transaction_hash: txHash,
        transaction_type: 'reward',
        amount: kcodeReward.toString(),
        status: 'confirmed',
        description: 'Daily Meditation Reward',
        contract_address: process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS,
      });

    if (txError) {
      console.error('[Meditation] ⚠️ Error recording transaction:', txError);
      // Don't fail - tokens already minted on-chain
    } else {
      console.log('[Meditation] ✅ Transaction recorded successfully');
    }

    // Also record in kcode_transactions for compatibility
    const { error: kcodeError } = await supabase
      .from('kcode_transactions')
      .insert({
        user_id: user.id,
        amount: kcodeReward,
        type: 'meditation',
        description: 'Daily Meditation Reward',
        tx_hash: txHash,
      });

    if (kcodeError) {
      console.error('[Meditation] ⚠️ Error recording kcode transaction:', kcodeError);
      // Don't fail - meditation already recorded
    }

    console.log('[Meditation] ✅ Meditation completed for user:', user.id);

    return NextResponse.json({
      success: true,
      data: {
        kcode: kcodeReward,
        newTotal: newKcode,
        txHash,
      }
    });

  } catch (error) {
    console.error('[Meditation] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
