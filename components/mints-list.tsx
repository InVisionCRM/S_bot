/**
 * Mints List Component
 * Displays a list of mint events with filtering and sorting
 */

'use client';

import { useState, useMemo } from 'react';
import { MintCard } from './mint-card';
import type { MintEventInfo } from '@/types/mint-events';

interface MintsListProps {
  mints: MintEventInfo[];
  loading?: boolean;
}

type SortType = 'newest' | 'oldest' | 'amount-high' | 'amount-low';

export function MintsList({ mints, loading }: MintsListProps) {
  const [sort, setSort] = useState<SortType>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAndSortedMints = useMemo(() => {
    let filtered = [...mints];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.token.toLowerCase().includes(query) ||
          m.tokenInfo.symbol.toLowerCase().includes(query) ||
          m.tokenInfo.name.toLowerCase().includes(query) ||
          m.to.toLowerCase().includes(query) ||
          m.transactionHash.toLowerCase().includes(query)
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      if (sort === 'newest') {
        return b.blockNumber - a.blockNumber;
      } else if (sort === 'oldest') {
        return a.blockNumber - b.blockNumber;
      } else if (sort === 'amount-high') {
        const amountA = BigInt(a.amount);
        const amountB = BigInt(b.amount);
        return amountA > amountB ? -1 : amountA < amountB ? 1 : 0;
      } else if (sort === 'amount-low') {
        const amountA = BigInt(a.amount);
        const amountB = BigInt(b.amount);
        return amountA < amountB ? -1 : amountA > amountB ? 1 : 0;
      }
      return 0;
    });

    return filtered;
  }, [mints, sort, searchQuery]);

  const stats = useMemo(() => {
    const totalAmount = mints.reduce((sum, m) => {
      try {
        return sum + BigInt(m.amount);
      } catch {
        return sum;
      }
    }, BigInt(0));

    return {
      total: mints.length,
      totalAmount: totalAmount.toString(),
      uniqueTokens: new Set(mints.map((m) => m.token)).size,
    };
  }, [mints]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading mint events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats and Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          {/* Stats */}
          <div className="flex flex-wrap gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Mints</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.uniqueTokens}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Unique Tokens</div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by token address, symbol, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Highest Amount</option>
            <option value="amount-low">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Mints Grid */}
      {filteredAndSortedMints.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {mints.length === 0 ? 'No mint events found. Check back soon!' : 'No mints match your search.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedMints.map((mint) => (
            <MintCard key={`${mint.transactionHash}-${mint.logIndex}`} mint={mint} />
          ))}
        </div>
      )}
    </div>
  );
}

