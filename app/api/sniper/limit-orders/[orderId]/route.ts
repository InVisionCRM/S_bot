/**
 * API Route: Cancel Limit Order
 * DELETE /api/sniper/limit-orders/[orderId]
 */

import { NextRequest } from 'next/server';
import { getAutoSellEngine } from '@/lib/sniper/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;

    const autoSell = getAutoSellEngine();

    autoSell.cancelLimitOrder(orderId);

    console.log('[API] Cancelled limit order:', orderId);

    return Response.json({
      success: true,
      message: 'Limit order cancelled',
    });
  } catch (error) {
    console.error('[API] Error cancelling limit order:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
