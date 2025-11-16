/**
 * Sniper Settings Component
 * Configure sniper bot settings
 */

'use client';

import { useState } from 'react';
import type { SniperConfig } from '@/types/sniper';

interface SniperSettingsProps {
  config: SniperConfig;
  onConfigChange: (config: Partial<SniperConfig>) => void;
  isRunning: boolean;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  walletAddress: string | null;
  balance: string;
  isInitialized: boolean;
}

export function SniperSettings({
  config,
  onConfigChange,
  isRunning,
  onStart,
  onStop,
  walletAddress,
  balance,
  isInitialized,
}: SniperSettingsProps) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStart();
    } catch (error) {
      console.error('Failed to start sniper:', error);
      alert('Failed to start sniper. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await onStop();
    } catch (error) {
      console.error('Failed to stop sniper:', error);
      alert('Failed to stop sniper. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            🎯 Sniper Bot Settings
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Auto-buy Pump.tires token launches
          </p>
        </div>

        {/* Start/Stop Toggle */}
        <div className="flex items-center gap-3">
          {isInitialized && (
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {parseFloat(balance).toFixed(2)} PLS
              </div>
            </div>
          )}

          <button
            onClick={isRunning ? handleStop : handleStart}
            disabled={loading || !isInitialized}
            className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isRunning
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {loading ? '...' : isRunning ? '⏹ Stop Sniping' : '▶ Start Sniping'}
          </button>
        </div>
      </div>

      {!isInitialized && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Add your SNIPER_PRIVATE_KEY to .env.local and restart the dev server to initialize the sniper bot.
          </p>
        </div>
      )}

      {/* Buy Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Buy Settings
          </h3>
          <label className="flex items-center gap-2 ml-auto cursor-pointer">
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto-Buy</span>
            <input
              type="checkbox"
              checked={config.autoBuyEnabled}
              onChange={(e) => onConfigChange({ autoBuyEnabled: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buy Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buy Amount (PLS)
            </label>
            <input
              type="number"
              value={config.buyAmountPLS}
              onChange={(e) => onConfigChange({ buyAmountPLS: e.target.value })}
              min="1"
              step="10"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Amount to spend per snipe
            </p>
          </div>

          {/* Slippage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Slippage (%)
            </label>
            <input
              type="number"
              value={config.slippagePercent}
              onChange={(e) => onConfigChange({ slippagePercent: parseFloat(e.target.value) })}
              min="1"
              max="50"
              step="1"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="10"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Max price slippage tolerance
            </p>
          </div>

          {/* Gas Limit Multiplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gas Limit Multiplier
            </label>
            <input
              type="number"
              value={config.gasLimitMultiplier}
              onChange={(e) => onConfigChange({ gasLimitMultiplier: parseFloat(e.target.value) })}
              min="1"
              max="3"
              step="0.1"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="1.2"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Multiply estimated gas (1.2 = 120%)
            </p>
          </div>

          {/* Custom Gas Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gas Price (Gwei) - Optional
            </label>
            <input
              type="number"
              value={config.gasPriceGwei || ''}
              onChange={(e) => onConfigChange({ gasPriceGwei: e.target.value || undefined })}
              min="1"
              step="1"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="Auto"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave empty for network default
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Sell Settings */}
      <div className="space-y-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Auto-Sell Settings (Limit Orders)
          </h3>
          <label className="flex items-center gap-2 ml-auto cursor-pointer">
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto-Sell</span>
            <input
              type="checkbox"
              checked={config.autoSellEnabled}
              onChange={(e) => onConfigChange({ autoSellEnabled: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Take Profit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Take Profit (%)
            </label>
            <input
              type="number"
              value={config.takeProfitPercent || ''}
              onChange={(e) =>
                onConfigChange({
                  takeProfitPercent: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              min="10"
              step="10"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="100"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Sell when profit hits % (100 = 2x, 200 = 3x)
            </p>
          </div>

          {/* Stop Loss */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stop Loss (%)
            </label>
            <input
              type="number"
              value={config.stopLossPercent || ''}
              onChange={(e) =>
                onConfigChange({
                  stopLossPercent: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              min="1"
              max="99"
              step="5"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="50"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Sell when loss hits % (50 = -50%)
            </p>
          </div>
        </div>
      </div>

      {/* Status Info */}
      {isRunning && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Sniper Bot Active - Monitoring for Pump.tires launches
            </span>
          </div>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">
            {config.autoBuyEnabled
              ? `Will auto-buy ${config.buyAmountPLS} PLS per launch with ${config.slippagePercent}% slippage`
              : 'Auto-buy disabled - monitoring only'}
          </p>
        </div>
      )}
    </div>
  );
}
