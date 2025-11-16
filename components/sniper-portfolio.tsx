/**
 * Sniper Portfolio Component
 * Display and manage sniped token positions
 */

'use client';

import { useState } from 'react';
import type { TokenPosition } from '@/types/sniper';
import { PULSECHAIN_CONFIG } from '@/config/pulsechain';

interface SniperPortfolioProps {
  positions: TokenPosition[];
  onSell: (tokenAddress: string, amount?: string) => Promise<void>;
  onCreateLimitOrder?: (tokenAddress: string) => void;
}

export function SniperPortfolio({ positions, onSell, onCreateLimitOrder }: SniperPortfolioProps) {
  const [sellLoading, setSellLoading] = useState<string | null>(null);

  const handleSell = async (position: TokenPosition) => {
    if (!confirm(`Sell all ${position.tokenSymbol}?`)) {
      return;
    }

    setSellLoading(position.tokenAddress);
    try {
      await onSell(position.tokenAddress);
    } catch (error) {
      console.error('Failed to sell:', error);
      alert('Failed to sell. Check console for details.');
    } finally {
      setSellLoading(null);
    }
  };

  const holdingPositions = positions.filter((p) => p.status === 'holding');
  const soldPositions = positions.filter((p) => p.status === 'sold');

  // Calculate stats
  const totalInvested = positions.reduce(
    (sum, p) => sum + parseFloat(p.buyPricePLS || '0'),
    0
  );
  const totalRealized = soldPositions.reduce(
    (sum, p) => sum + parseFloat(p.sellPricePLS || '0'),
    0
  );

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatProfitLoss = (position: TokenPosition) => {
    if (!position.profitLossPercent) return null;

    const isProfit = position.profitLossPercent > 0;
    return (
      <span className={isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
        {isProfit ? '+' : ''}{position.profitLossPercent.toFixed(2)}%
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            💼 Sniper Portfolio
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {positions.length} total positions ({holdingPositions.length} holding, {soldPositions.length} sold)
          </p>
        </div>

        {/* Stats */}
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Stats</div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Invested: {totalInvested.toFixed(2)} PLS
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Realized: {totalRealized.toFixed(2)} PLS
          </div>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No positions yet. Start sniping to see your portfolio here!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Holding Positions */}
          {holdingPositions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Holding ({holdingPositions.length})
              </h3>
              <div className="space-y-3">
                {holdingPositions.map((position) => (
                  <div
                    key={position.tokenAddress}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {position.tokenSymbol}
                          </h4>
                          <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                            Holding
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {position.tokenName}
                        </p>

                        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Buy Price:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {position.buyPricePLS} PLS
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {parseFloat(position.amountTokens).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Current Price:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {position.currentPricePLS || '...'} PLS
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">P/L:</span>
                            <span className="ml-2 font-medium">
                              {formatProfitLoss(position) || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Bought: {formatTime(position.buyTimestamp)}
                        </div>

                        <a
                          href={`${PULSECHAIN_CONFIG.blockExplorer}/address/${position.tokenAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mt-1 inline-block"
                        >
                          {position.tokenAddress.slice(0, 10)}...{position.tokenAddress.slice(-8)} →
                        </a>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleSell(position)}
                          disabled={sellLoading === position.tokenAddress}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {sellLoading === position.tokenAddress ? 'Selling...' : 'Sell'}
                        </button>

                        {onCreateLimitOrder && (
                          <button
                            onClick={() => onCreateLimitOrder(position.tokenAddress)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Limit Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sold Positions */}
          {soldPositions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Sold ({soldPositions.length})
              </h3>
              <div className="space-y-3">
                {soldPositions.map((position) => (
                  <div
                    key={position.tokenAddress}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 opacity-75"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {position.tokenSymbol}
                          </h4>
                          <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            Sold
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Buy:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {position.buyPricePLS} PLS
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Sell:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {position.sellPricePLS} PLS
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">P/L:</span>
                            <span className="ml-2 font-medium">
                              {formatProfitLoss(position) || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Sold: {position.sellTimestamp ? formatTime(position.sellTimestamp) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
