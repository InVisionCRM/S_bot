/**
 * API Route: Get Sniper Status
 * GET /api/sniper/status
 */

import { NextRequest } from 'next/server';
import { getSniperEngine } from '@/lib/sniper/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const sniper = getSniperEngine();

    const balance = sniper.initialized ? await sniper.getBalance() : '0';

    return Response.json({
      isRunning: sniper.running,
      isInitialized: sniper.initialized,
      walletAddress: sniper.getWalletAddress(),
      balance,
      config: sniper.getConfig(),
    });
  } catch (error) {
    console.error('[API] Error getting sniper status:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
