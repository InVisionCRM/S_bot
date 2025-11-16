/**
 * API Route: Get Wallet Balance
 * GET /api/sniper/balance
 */

import { NextRequest } from 'next/server';
import { getSniperEngine } from '@/lib/sniper/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const sniper = getSniperEngine();

    if (!sniper.initialized) {
      return Response.json(
        { error: 'Sniper not initialized' },
        { status: 400 }
      );
    }

    const balance = await sniper.getBalance();

    return Response.json({
      balance,
      address: sniper.getWalletAddress(),
    });
  } catch (error) {
    console.error('[API] Error getting balance:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
