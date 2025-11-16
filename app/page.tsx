/**
 * Main Dashboard Page
 * PulseChain Token Sniper Bot & Watcher
 */

'use client';

import { useState } from 'react';
import { PairsList } from '@/components/pairs-list';
import { MintsList } from '@/components/mints-list';
import { SniperSettings } from '@/components/sniper-settings';
import { SniperPortfolio } from '@/components/sniper-portfolio';
import { LimitOrders } from '@/components/limit-orders';
import { usePairs, usePairStream } from '@/lib/hooks/use-pairs';
import { useMints, useMintStream } from '@/lib/hooks/use-mints';
import { useSniper, usePortfolio, useLimitOrders } from '@/lib/hooks/use-sniper';
import { PULSECHAIN_CONFIG } from '@/config/pulsechain';
import type { PairInfo } from '@/types/contracts';
import type { MintEventInfo } from '@/types/mint-events';

export default function Home() {
  const [view, setView] = useState<'pairs' | 'mints' | 'sniper'>('mints');
  const [mode, setMode] = useState<'polling' | 'streaming'>('streaming');
  const [showTokenInfo, setShowTokenInfo] = useState(true);

  // Polling mode - fetches pairs at intervals
  const {
    pairs: polledPairs,
    loading: pollingLoading,
    error: pollingError,
    refresh: refreshPairs,
  } = usePairs({
    includeTokenInfo: showTokenInfo,
    blockRange: 1000,
    autoRefresh: mode === 'polling',
    refreshInterval: 15000, // Refresh every 15 seconds
  });

  // Streaming mode - real-time updates via SSE
  const { pairs: streamedPairs, connected: pairsConnected, error: streamError, providerInfo: pairsProviderInfo } = usePairStream((newPair) => {
    console.log('New pair detected:', newPair);
  }, mode === 'streaming' && view === 'pairs');

  const activePairs = mode === 'streaming' ? streamedPairs : polledPairs;
  const pairsLoading = mode === 'polling' ? pollingLoading : false;
  const pairsError = mode === 'streaming' ? streamError : pollingError;

  // Mint events - polling mode
  const {
    mints: polledMints,
    loading: mintsLoading,
    error: mintsError,
    refresh: refreshMints,
  } = useMints({
    includeTokenInfo: showTokenInfo,
    blockRange: 1000,
    autoRefresh: mode === 'polling',
    refreshInterval: 15000,
  });

  // Mint events - streaming mode
  const { mints: streamedMints, connected: mintsConnected, error: mintsStreamError, providerInfo: mintsProviderInfo } = useMintStream((newMint) => {
    console.log('New mint detected:', newMint);
  }, mode === 'streaming' && view === 'mints');

  const activeMints = mode === 'streaming' ? streamedMints : polledMints;
  const mintsLoadingState = mode === 'polling' ? mintsLoading : false;
  const mintsErrorState = mode === 'streaming' ? mintsStreamError : mintsError;

  // Sniper hooks
  const sniper = useSniper();
  const portfolio = usePortfolio();
  const limitOrders = useLimitOrders();

  // Get active connection status and provider info based on view
  const connected = view === 'pairs' ? pairsConnected : view === 'mints' ? mintsConnected : false;
  const providerInfo = view === 'pairs' ? pairsProviderInfo : view === 'mints' ? mintsProviderInfo : undefined;
  const loading = view === 'pairs' ? pairsLoading : view === 'mints' ? mintsLoadingState : false;
  const error = view === 'pairs' ? pairsError : view === 'mints' ? mintsErrorState : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" suppressHydrationWarning>
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                PulseChain Token Sniper Bot
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {view === 'pairs'
                  ? 'Monitoring PulseX V1 & V2 Factories for New Token Pairs'
                  : view === 'mints'
                  ? 'Monitoring Token Mint Events (Transfers from Zero Address)'
                  : 'Automated Pump.tires Token Sniper Bot'
                }
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setView('mints')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    view === 'mints'
                      ? 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  🪙 Mints
                </button>
                <button
                  onClick={() => setView('sniper')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    view === 'sniper'
                      ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  🎯 Sniper
                </button>
                <button
                  onClick={() => setView('pairs')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    view === 'pairs'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  📊 Pairs
                </button>
              </div>

              {/* Connection Status */}
              {mode === 'streaming' && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`}
                      title={connected ? 'Connected' : 'Disconnected'}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {connected ? 'Live' : 'Reconnecting...'}
                    </span>
                  </div>
                  {providerInfo && (
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {providerInfo}
                    </span>
                  )}
                </div>
              )}

              {/* Mode Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setMode('polling')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    mode === 'polling'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Polling
                </button>
                <button
                  onClick={() => setMode('streaming')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    mode === 'streaming'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Streaming
                </button>
              </div>

              {/* Refresh Button (polling mode only) */}
              {mode === 'polling' && (
                <button
                  onClick={view === 'pairs' ? refreshPairs : refreshMints}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              )}
            </div>
          </div>

          {/* Watched Address Info */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Watched Address:
              </span>
              <code className="text-xs font-mono text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                {PULSECHAIN_CONFIG.watchedAddress}
              </code>
              <a
                href={`${PULSECHAIN_CONFIG.blockExplorer}/address/${PULSECHAIN_CONFIG.watchedAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View on Explorer →
              </a>
            </div>
            <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
              {view === 'pairs'
                ? 'Pairs highlighted in green indicate this address holds tokens from the pair.'
                : view === 'mints'
                ? 'Mint events show when tokens are transferred from the zero address (0x000...000) to this watched address.'
                : 'Automated sniper bot for Pump.tires token launches. Configure settings below to start sniping!'
              }
            </div>
          </div>

          {/* Factory Addresses (only show for pairs view) */}
          {view === 'pairs' && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">V1 Factory: </span>
                <code className="font-mono text-gray-700 dark:text-gray-300">
                  {PULSECHAIN_CONFIG.factories.v1.slice(0, 10)}...{PULSECHAIN_CONFIG.factories.v1.slice(-8)}
                </code>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">V2 Factory: </span>
                <code className="font-mono text-gray-700 dark:text-gray-300">
                  {PULSECHAIN_CONFIG.factories.v2.slice(0, 10)}...{PULSECHAIN_CONFIG.factories.v2.slice(-8)}
                </code>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-red-600 dark:text-red-400 font-medium">Error:</span>
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="mb-4 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showTokenInfo}
              onChange={(e) => setShowTokenInfo(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Include Token Info (slower but more detailed)
            </span>
          </label>
        </div>

        {/* Content - Pairs, Mints, or Sniper */}
        {view === 'pairs' ? (
          <PairsList pairs={activePairs} loading={loading} />
        ) : view === 'mints' ? (
          <MintsList mints={activeMints} loading={loading} />
        ) : (
          <div className="space-y-6">
            <SniperSettings
              config={sniper.config}
              onConfigChange={sniper.updateConfig}
              isRunning={sniper.isRunning}
              onStart={sniper.start}
              onStop={sniper.stop}
              walletAddress={sniper.walletAddress}
              balance={sniper.balance}
              isInitialized={sniper.isInitialized}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SniperPortfolio
                positions={portfolio.positions}
                onSell={portfolio.sellPosition}
                onCreateLimitOrder={(tokenAddress) => {
                  // TODO: Open modal to create limit order
                  console.log('Create limit order for:', tokenAddress);
                }}
              />

              <LimitOrders
                orders={limitOrders.orders}
                onCancel={limitOrders.cancelOrder}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              PulseChain Token Sniper Bot - Monitoring PulseX Factory Contracts
            </p>
            <p className="mt-1">
              Chain ID: {PULSECHAIN_CONFIG.chainId} | RPC: {PULSECHAIN_CONFIG.rpcUrls.primary}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
