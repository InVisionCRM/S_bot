/**
 * API Route: Get recent mint events
 * Returns recently detected token mints (Transfer from zero address) to watched address
 */

import { NextResponse } from 'next/server';
import { MintWatcher } from '@/lib/blockchain/mint-watcher';
import { getTokenInfo } from '@/lib/blockchain/token-info';
import type { MintEventInfo } from '@/types/mint-events';
import { asyncPool, withRetry } from '@/lib/utils/async';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Format token amount with decimals
 */
function formatAmount(amount: string, decimals: number): string {
  try {
    const num = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const whole = num / divisor;
    const fraction = num % divisor;
    
    if (fraction === BigInt(0)) {
      return whole.toString();
    }
    
    const fractionStr = fraction.toString().padStart(decimals, '0');
    const trimmed = fractionStr.replace(/0+$/, '');
    
    return trimmed ? `${whole}.${trimmed}` : whole.toString();
  } catch {
    return '0';
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const blockRange = parseInt(searchParams.get('blockRange') || '1000', 10);
    const includeTokenInfo = searchParams.get('includeTokenInfo') === 'true';

    const watcher = new MintWatcher();
    const mints = await watcher.getRecentMints(blockRange);

    let enrichedMints: MintEventInfo[] = mints as unknown as MintEventInfo[];

    if (includeTokenInfo) {
      // Enrich with token information (rate-limit friendly)
      const CAP = 30;
      const CONCURRENCY = 3;
      const tokenInfoCache = new Map<string, Awaited<ReturnType<typeof getTokenInfo>> | null>();

      const getInfoCached = async (addr: string) => {
        const key = addr.toLowerCase();
        if (tokenInfoCache.has(key)) return tokenInfoCache.get(key) || null;
        const info = await withRetry(() => getTokenInfo(addr).catch(() => null), 2, 250);
        tokenInfoCache.set(key, info);
        return info;
      };

      const items = mints.slice(0, CAP);

      const results = await asyncPool(CONCURRENCY, items, async (mint) => {
        try {
          const tokenInfo = await getInfoCached(mint.token);

          if (!tokenInfo) {
            return {
              ...mint,
              tokenInfo: {
                address: mint.token,
                name: 'Unknown',
                symbol: 'UNKNOWN',
                decimals: 18,
              },
              formattedAmount: formatAmount(mint.amount, 18),
              isWatchedAddress: true,
            } as MintEventInfo;
          }

          return {
            ...mint,
            tokenInfo: {
              address: tokenInfo.address,
              name: tokenInfo.name,
              symbol: tokenInfo.symbol,
              decimals: tokenInfo.decimals,
              totalSupply: tokenInfo.totalSupply,
            },
            formattedAmount: formatAmount(mint.amount, tokenInfo.decimals),
            isWatchedAddress: true,
          } as MintEventInfo;
        } catch (error) {
          console.error('Error enriching mint event:', error);
          return {
            ...mint,
            tokenInfo: {
              address: mint.token,
              name: 'Unknown',
              symbol: 'UNKNOWN',
              decimals: 18,
            },
            formattedAmount: formatAmount(mint.amount, 18),
            isWatchedAddress: true,
          } as MintEventInfo;
        }
      });

      enrichedMints = results;
    } else {
      // Still format amounts with default decimals
      enrichedMints = mints.map((mint) => ({
        ...mint,
        tokenInfo: {
          address: mint.token,
          name: 'Unknown',
          symbol: 'UNKNOWN',
          decimals: 18,
        },
        formattedAmount: formatAmount(mint.amount, 18),
        isWatchedAddress: true,
      }));
    }

    return NextResponse.json({
      success: true,
      count: enrichedMints.length,
      mints: enrichedMints,
    });
  } catch (error) {
    console.error('Error fetching mint events:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

