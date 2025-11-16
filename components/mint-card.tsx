/**
 * Mint Event Card Component
 * Displays information about a token mint event (Transfer from zero address)
 */

'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { MintEventInfo } from '@/types/mint-events';
import { PULSECHAIN_CONFIG } from '@/config/pulsechain';

interface MintCardProps {
  mint: MintEventInfo;
}

export function MintCard({ mint }: MintCardProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');
  
  useEffect(() => {
    // Calculate time ago on client side only to avoid hydration mismatch
    const date = new Date(mint.timestamp * 1000);
    setTimeAgo(formatDistanceToNow(date, { addSuffix: true }));
    
    // Update every minute
    const interval = setInterval(() => {
      setTimeAgo(formatDistanceToNow(date, { addSuffix: true }));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [mint.timestamp]);
  
  const blockExplorerUrl = `${PULSECHAIN_CONFIG.blockExplorer}/address/${mint.token}`;
  const txUrl = `${PULSECHAIN_CONFIG.blockExplorer}/tx/${mint.transactionHash}`;

  return (
    <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-4 transition-all hover:shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-semibold rounded bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            🪙 MINT
          </span>
          {mint.isWatchedAddress && (
            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              TO WATCHED ADDRESS
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {timeAgo || '...'}
        </span>
      </div>

      <div className="space-y-3">
        {/* Token Info */}
        <div className="p-3 bg-white dark:bg-gray-800 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Token
            </span>
            <a
              href={blockExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View Token →
            </a>
          </div>
          <div className="mb-2">
            <div className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
              {mint.tokenInfo.symbol || 'UNKNOWN'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {mint.tokenInfo.name || 'Unknown Token'}
            </div>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-full">
            {mint.token}
          </div>
        </div>

        {/* Mint Amount */}
        <div className="p-3 bg-white dark:bg-gray-800 rounded">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Minted Amount
          </div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {mint.formattedAmount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Raw: {mint.amount}
          </div>
        </div>

        {/* Recipient */}
        <div className="p-3 bg-white dark:bg-gray-800 rounded">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Recipient
          </div>
          <div className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate">
            {mint.to}
          </div>
          {mint.isWatchedAddress && (
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              ✓ This is your watched address
            </div>
          )}
        </div>

        {/* Transaction and Block Info */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Block:</span>
            <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
              #{mint.blockNumber.toLocaleString()}
            </span>
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
      </div>
    </div>
  );
}

