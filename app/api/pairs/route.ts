/**
 * API Route: Get recent pairs
 * Returns recently created pairs from PulseX factories
 */

import { NextResponse } from 'next/server';
import { FactoryWatcher } from '@/lib/blockchain/factory-watcher';
import { getTokenInfo, checkWatchedAddressInvolvement } from '@/lib/blockchain/token-info';
import type { PairInfo } from '@/types/contracts';
import { asyncPool, withRetry } from '@/lib/utils/async';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const blockRange = parseInt(searchParams.get('blockRange') || '1000', 10);
    const includeTokenInfo = searchParams.get('includeTokenInfo') === 'true';

    const watcher = new FactoryWatcher();
    const pairs = await watcher.getRecentPairs(blockRange);

    let enrichedPairs: PairInfo[];

    if (includeTokenInfo) {
      // Enrich with token information (rate-limit friendly)
      // Cap to first N pairs and limit concurrency to reduce RPC pressure
      const CAP = 20;
      const CONCURRENCY = 3;
      const tokenInfoCache = new Map<string, Awaited<ReturnType<typeof getTokenInfo>> | null>();

      const getInfoCached = async (addr: string) => {
        const key = addr.toLowerCase();
        if (tokenInfoCache.has(key)) return tokenInfoCache.get(key) || null;
        // Retry small number of times with backoff
        const info = await withRetry(() => getTokenInfo(addr).catch(() => null), 2, 250);
        tokenInfoCache.set(key, info);
        return info;
      };

      const items = pairs.slice(0, CAP);

      const results = await asyncPool(CONCURRENCY, items, async (pair) => {
        try {
          const [token0Info, token1Info, involvement] = await Promise.all([
            getInfoCached(pair.token0),
            getInfoCached(pair.token1),
            withRetry(() => checkWatchedAddressInvolvement(pair.token0, pair.token1).catch(() => null), 1, 250),
          ]);

          return {
            ...pair,
            token0Info: token0Info || {
              address: pair.token0,
              name: 'Unknown',
              symbol: 'UNKNOWN',
              decimals: 18,
              totalSupply: '0',
            },
            token1Info: token1Info || {
              address: pair.token1,
              name: 'Unknown',
              symbol: 'UNKNOWN',
              decimals: 18,
              totalSupply: '0',
            },
            watchedAddressInvolvement: involvement || undefined,
          } as PairInfo;
        } catch (error) {
          console.error('Error enriching pair:', error);
          return {
            ...pair,
            token0Info: {
              address: pair.token0,
              name: 'Unknown',
              symbol: 'UNKNOWN',
              decimals: 18,
              totalSupply: '0',
            },
            token1Info: {
              address: pair.token1,
              name: 'Unknown',
              symbol: 'UNKNOWN',
              decimals: 18,
              totalSupply: '0',
            },
          } as PairInfo;
        }
      });

      enrichedPairs = results;
    } else {
      // Provide minimal token info to satisfy PairInfo type when not enriching
      enrichedPairs = pairs.map((pair) => ({
        ...pair,
        token0Info: {
          address: pair.token0,
          name: 'Unknown',
          symbol: 'UNKNOWN',
          decimals: 18,
          totalSupply: '0',
        },
        token1Info: {
          address: pair.token1,
          name: 'Unknown',
          symbol: 'UNKNOWN',
          decimals: 18,
          totalSupply: '0',
        },
      }));
    }

    return NextResponse.json({
      success: true,
      count: enrichedPairs.length,
      pairs: enrichedPairs,
    });
  } catch (error) {
    console.error('Error fetching pairs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

