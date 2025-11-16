/**
 * API Route: Start Sniper
 * POST /api/sniper/start
 */

import { NextRequest } from 'next/server';
import { getSniperEngine, updateSniperConfig, getAutoSellEngine } from '@/lib/sniper/server';
import type { SniperConfig } from '@/types/sniper';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body as { config?: Partial<SniperConfig> };

    const sniper = getSniperEngine();

    if (!sniper.initialized) {
      return Response.json(
        { error: 'Sniper not initialized. Check SNIPER_PRIVATE_KEY in .env.local' },
        { status: 400 }
      );
    }

    // Update config if provided
    if (config) {
      updateSniperConfig(config);
    }

    // Start sniper
    sniper.start();

    // Start auto-sell if enabled
    const currentConfig = sniper.getConfig();
    if (currentConfig.autoSellEnabled) {
      const autoSell = getAutoSellEngine();
      autoSell.start();
      console.log('[API] Auto-sell engine started');
    }

    console.log('[API] Sniper started with config:', currentConfig);

    return Response.json({
      success: true,
      message: 'Sniper started',
      config: currentConfig,
    });
  } catch (error) {
    console.error('[API] Error starting sniper:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
