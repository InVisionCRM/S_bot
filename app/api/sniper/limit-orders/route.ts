/**
 * API Route: Limit Orders
 * GET /api/sniper/limit-orders - Get all limit orders
 * POST /api/sniper/limit-orders - Create new limit order
 */

import { NextRequest } from 'next/server';
import { getAutoSellEngine } from '@/lib/sniper/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const autoSell = getAutoSellEngine();

    const orders = autoSell.getLimitOrders();

    return Response.json({
      orders,
    });
  } catch (error) {
    console.error('[API] Error getting limit orders:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenAddress, orderType, targetPricePLS, amountTokens } = body;

    if (!tokenAddress || !orderType || !targetPricePLS) {
      return Response.json(
        { error: 'Missing required fields: tokenAddress, orderType, targetPricePLS' },
        { status: 400 }
      );
    }

    const autoSell = getAutoSellEngine();

    const order = autoSell.createLimitOrder(
      tokenAddress,
      orderType,
      targetPricePLS,
      amountTokens
    );

    console.log('[API] Created limit order:', order);

    return Response.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('[API] Error creating limit order:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
