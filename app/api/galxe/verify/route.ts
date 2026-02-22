import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://kabbalahcode.space',
  'https://galxe.com',
  'https://app.galxe.com',
  'https://www.galxe.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
].filter(Boolean) as string[];

/**
 * Galxe Verification Endpoint
 * Проверяет зарегистрирован ли пользователь в waitlist
 * 
 * GET /api/galxe/verify?address=0x...
 * 
 * Response:
 * {
 *   registered: boolean,
 *   wallet?: string,
 *   email?: string,
 *   timestamp?: string,
 *   referral_count?: number,
 *   points?: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address');
    
    // Get origin for CORS
    const origin = request.headers.get('origin');
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') 
      ? origin 
      : ALLOWED_ORIGINS[0];

    // Validate wallet address
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Validate address format (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    const supabase = await createClient();
    
    // Check if wallet is registered
    const { data, error } = await supabase
      .from('waitlist_registrations')
      .select('wallet_address, email, created_at, referral_count, points, "position"')
      .eq('wallet_address', walletAddress)
      .single();

    if (error || !data) {
      // Not registered
      return NextResponse.json(
        { 
          registered: false,
          message: 'Wallet not found in waitlist'
        },
        { 
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Registered - return data
    return NextResponse.json({
      registered: true,
      wallet: data.wallet_address,
      email: data.email,
      timestamp: data.created_at,
      referral_count: data.referral_count || 0,
      points: data.points || 0,
      position: data.position || null
    }, {
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Credentials': 'true',
      }
    });

  } catch (error) {
    console.error('Galxe verification error:', error);
    const origin = request.headers.get('origin');
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') 
      ? origin 
      : ALLOWED_ORIGINS[0];
      
    return NextResponse.json(
      { 
        error: 'Internal server error',
        registered: false
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') 
    ? origin 
    : ALLOWED_ORIGINS[0];
    
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
