/**
 * API Route: Get Portfolio
 * GET /api/sniper/portfolio
 */

import { NextRequest } from 'next/server';
import { getSniperEngine } from '@/lib/sniper/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const sniper = getSniperEngine();

    const positions = sniper.getPositions();

    return Response.json({
      positions,
    });
  } catch (error) {
    console.error('[API] Error getting portfolio:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
