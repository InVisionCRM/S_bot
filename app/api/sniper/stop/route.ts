/**
 * API Route: Stop Sniper
 * POST /api/sniper/stop
 */

import { NextRequest } from 'next/server';
import { getSniperEngine, getAutoSellEngine } from '@/lib/sniper/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const sniper = getSniperEngine();
    sniper.stop();

    // Stop auto-sell engine
    const autoSell = getAutoSellEngine();
    autoSell.stop();

    console.log('[API] Sniper stopped');

    return Response.json({
      success: true,
      message: 'Sniper stopped',
    });
  } catch (error) {
    console.error('[API] Error stopping sniper:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
