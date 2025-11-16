/**
 * API Route: Sell Position
 * POST /api/sniper/sell/[tokenAddress]
 */

import { NextRequest } from 'next/server';
import { getSniperEngine } from '@/lib/sniper/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tokenAddress: string }> }
) {
  try {
    const { tokenAddress } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { amount } = body as { amount?: string };

    const sniper = getSniperEngine();

    if (!sniper.initialized) {
      return Response.json(
        { error: 'Sniper not initialized' },
        { status: 400 }
      );
    }

    console.log('[API] Selling token:', { tokenAddress, amount });

    const txResponse = await sniper.sellToken(tokenAddress, amount);

    const receipt = await txResponse.wait();

    return Response.json({
      success: true,
      txHash: txResponse.hash,
      status: receipt?.status === 1 ? 'success' : 'failed',
    });
  } catch (error) {
    console.error('[API] Error selling token:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
