/**
 * Pair Card Component
 * Displays information about a newly created token pair
 */

'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { PairInfo } from '@/types/contracts';
import { PULSECHAIN_CONFIG } from '@/config/pulsechain';

interface PairCardProps {
  pair: PairInfo;
}

export function PairCard({ pair }: PairCardProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');
  
  useEffect(() => {
    // Calculate time ago on client side only to avoid hydration mismatch
    const date = new Date(pair.timestamp * 1000);
    setTimeAgo(formatDistanceToNow(date, { addSuffix: true }));
    
    // Update every minute
    const interval = setInterval(() => {
      setTimeAgo(formatDistanceToNow(date, { addSuffix: true }));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [pair.timestamp]);
  
  const blockExplorerUrl = `${PULSECHAIN_CONFIG.blockExplorer}/address/${pair.pair}`;
  const token0Url = `${PULSECHAIN_CONFIG.blockExplorer}/address/${pair.token0}`;
  const token1Url = `${PULSECHAIN_CONFIG.blockExplorer}/address/${pair.token1}`;
  const txUrl = `${PULSECHAIN_CONFIG.blockExplorer}/tx/${pair.transactionHash}`;

  const hasInvolvement = pair.watchedAddressInvolvement && 
    (pair.watchedAddressInvolvement.hasToken0 || pair.watchedAddressInvolvement.hasToken1);

  return (
    <div className={`rounded-lg border p-4 transition-all hover:shadow-lg ${
      hasInvolvement 
        ? 'border-green-500 bg-green-50 dark:bg-green-950/20 dark:border-green-400' 
        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-semibold rounded ${
            pair.factoryVersion === 'v1' 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
              : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:bg-purple-200'
          }`}>
            {pair.factoryVersion.toUpperCase()}
          </span>
          {hasInvolvement && (
            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              WATCHED ADDRESS HOLDING
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {timeAgo || '...'}
        </span>
      </div>

      <div className="space-y-3">
        {/* Token 0 */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Token 0
            </span>
            {pair.watchedAddressInvolvement?.hasToken0 && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                ✓ Holding
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {pair.token0Info.symbol || 'UNKNOWN'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[200px]">
                {pair.token0}
              </div>
            </div>
            <a
              href={token0Url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
            >
              View →
            </a>
          </div>
          {pair.watchedAddressInvolvement?.token0Balance && 
            pair.watchedAddressInvolvement.token0Balance !== '0' && (
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Balance: {formatBalance(pair.watchedAddressInvolvement.token0Balance, pair.token0Info.decimals)}
            </div>
          )}
        </div>

        {/* Token 1 */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Token 1
            </span>
            {pair.watchedAddressInvolvement?.hasToken1 && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                ✓ Holding
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {pair.token1Info.symbol || 'UNKNOWN'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[200px]">
                {pair.token1}
              </div>
            </div>
            <a
              href={token1Url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
            >
              View →
            </a>
          </div>
          {pair.watchedAddressInvolvement?.token1Balance && 
            pair.watchedAddressInvolvement.token1Balance !== '0' && (
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Balance: {formatBalance(pair.watchedAddressInvolvement.token1Balance, pair.token1Info.decimals)}
            </div>
          )}
        </div>

        {/* Pair Address and Transaction */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Pair:</span>
            <a
              href={blockExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 truncate max-w-[150px]"
            >
              {pair.pair.slice(0, 10)}...{pair.pair.slice(-8)}
            </a>
          </div>
          <a
            href={txUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            View TX →
          </a>
        </div>

        <div className="text-xs text-gray-400 dark:text-gray-500">
          Block #{pair.blockNumber.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

/**
 * Format token balance for display
 */
function formatBalance(balance: string, decimals: number): string {
  try {
    const num = BigInt(balance);
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

