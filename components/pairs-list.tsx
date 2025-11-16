/**
 * Pairs List Component
 * Displays a list of token pairs with filtering and sorting
 */

'use client';

import { useState, useMemo } from 'react';
import { PairCard } from './pair-card';
import type { PairInfo } from '@/types/contracts';

interface PairsListProps {
  pairs: PairInfo[];
  loading?: boolean;
}

type FilterType = 'all' | 'v1' | 'v2' | 'watched';
type SortType = 'newest' | 'oldest' | 'block';

export function PairsList({ pairs, loading }: PairsListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAndSortedPairs = useMemo(() => {
    let filtered = [...pairs];

    // Apply filter
    if (filter === 'v1') {
      filtered = filtered.filter((p) => p.factoryVersion === 'v1');
    } else if (filter === 'v2') {
      filtered = filtered.filter((p) => p.factoryVersion === 'v2');
    } else if (filter === 'watched') {
      filtered = filtered.filter(
        (p) => p.watchedAddressInvolvement?.hasToken0 || p.watchedAddressInvolvement?.hasToken1
      );
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.token0.toLowerCase().includes(query) ||
          p.token1.toLowerCase().includes(query) ||
          p.pair.toLowerCase().includes(query) ||
          p.token0Info.symbol.toLowerCase().includes(query) ||
          p.token1Info.symbol.toLowerCase().includes(query) ||
          p.token0Info.name.toLowerCase().includes(query) ||
          p.token1Info.name.toLowerCase().includes(query)
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      if (sort === 'newest') {
        return b.blockNumber - a.blockNumber;
      } else if (sort === 'oldest') {
        return a.blockNumber - b.blockNumber;
      } else {
        // Sort by block number (newest first)
        return b.blockNumber - a.blockNumber;
      }
    });

    return filtered;
  }, [pairs, filter, sort, searchQuery]);

  const stats = useMemo(() => {
    const v1Count = pairs.filter((p) => p.factoryVersion === 'v1').length;
    const v2Count = pairs.filter((p) => p.factoryVersion === 'v2').length;
    const watchedCount = pairs.filter(
      (p) => p.watchedAddressInvolvement?.hasToken0 || p.watchedAddressInvolvement?.hasToken1
    ).length;

    return { total: pairs.length, v1: v1Count, v2: v2Count, watched: watchedCount };
  }, [pairs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading pairs...</p>
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
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Pairs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.v1}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">V1 Pairs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.v2}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">V2 Pairs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.watched}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Watched Address</div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by address, symbol, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('v1')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === 'v1'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              V1 ({stats.v1})
            </button>
            <button
              onClick={() => setFilter('v2')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === 'v2'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              V2 ({stats.v2})
            </button>
            <button
              onClick={() => setFilter('watched')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filter === 'watched'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Watched ({stats.watched})
            </button>
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="block">By Block</option>
          </select>
        </div>
      </div>

      {/* Pairs Grid */}
      {filteredAndSortedPairs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {pairs.length === 0 ? 'No pairs found. Check back soon!' : 'No pairs match your filters.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedPairs.map((pair) => (
            <PairCard key={`${pair.pair}-${pair.blockNumber}`} pair={pair} />
          ))}
        </div>
      )}
    </div>
  );
}

