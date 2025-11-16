/**
 * PulseX Factory Watcher
 * Monitors factory contracts for new pair creation events
 */

import { ethers } from 'ethers';
import { PULSECHAIN_CONFIG, FACTORY_ABI } from '@/config/pulsechain';
import type { PairCreatedEvent } from '@/types/contracts';
import { getServerProvider, createPulseChainProviderWithWebSocket } from './provider';

/**
 * Factory watcher service
 * Listens for PairCreated events from PulseX factories
 * 
 * NOTE: For true live event listening, use a WebSocket provider.
 * HTTP providers will poll in the background (less efficient).
 */
export class FactoryWatcher {
  private provider: ethers.JsonRpcProvider | ethers.WebSocketProvider;
  private factories: Array<{ address: string; version: 'v1' | 'v2'; contract: ethers.Contract }> = [];
  private listeners: Map<string, (event: PairCreatedEvent) => void> = new Map();
  private isListening: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastCheckedBlock: number = 0;

  constructor(provider?: ethers.JsonRpcProvider | ethers.WebSocketProvider, useWebSocket?: boolean) {
    // If explicitly requested and WebSocket URL is configured, use WebSocket for live events
    if (useWebSocket) {
      this.provider = provider || createPulseChainProviderWithWebSocket();
    } else {
      this.provider = provider || getServerProvider();
    }
    this.initializeFactories();
  }

  /**
   * Initialize factory contracts
   */
  private initializeFactories(): void {
    const v1Factory = new ethers.Contract(
      PULSECHAIN_CONFIG.factories.v1,
      FACTORY_ABI,
      this.provider
    );

    const v2Factory = new ethers.Contract(
      PULSECHAIN_CONFIG.factories.v2,
      FACTORY_ABI,
      this.provider
    );

    this.factories = [
      { address: PULSECHAIN_CONFIG.factories.v1, version: 'v1', contract: v1Factory },
      { address: PULSECHAIN_CONFIG.factories.v2, version: 'v2', contract: v2Factory },
    ];
  }

  /**
   * Start listening for PairCreated events from all factories
   * 
   * This sets up live event listeners using contract.on().
   * - With WebSocket provider: True real-time event streaming
   * - With HTTP provider: Polls every ~4 seconds (emulated events)
   * 
   * @param callback Function to call when new pairs are created
   * @param fromBlock Optional: block number to start from (for historical events)
   * @param includeHistorical Whether to fetch and process historical events on startup
   */
  async startListening(
    callback: (event: PairCreatedEvent) => void,
    fromBlock?: number,
    includeHistorical: boolean = true
  ): Promise<void> {
    if (this.isListening) {
      console.warn('FactoryWatcher is already listening. Stop first before starting again.');
      return;
    }

    this.isListening = true;
    const providerType = this.provider instanceof ethers.WebSocketProvider ? 'WebSocket' : 'HTTP';
    console.log(`[FactoryWatcher] Starting live event listener (${providerType} provider)...`);

    if (includeHistorical) {
      const startBlock = fromBlock || (await this.provider.getBlockNumber()) - 1000; // Last ~1000 blocks by default
      
      for (const factory of this.factories) {
        const filter = factory.contract.filters.PairCreated();
        
        // Get historical events
        try {
          const historicalEvents = await factory.contract.queryFilter(
            filter,
            startBlock,
            'latest'
          );

          // Process historical events
          console.log(`[FactoryWatcher] Found ${historicalEvents.length} historical pairs from ${factory.version} factory`);
          for (const event of historicalEvents) {
            if (event && event.args) {
              const pairEvent = await this.parsePairCreatedEvent(event, factory.version);
              callback(pairEvent);
            }
          }
        } catch (error) {
          console.error(`Error fetching historical events from ${factory.version} factory:`, error);
        }
      }
    }

    // Set up live event listeners
    // Different approach for WebSocket vs HTTP providers
    const isWebSocket = this.provider instanceof ethers.WebSocketProvider;

    if (isWebSocket) {
      // WebSocket: Use contract.on() for true real-time events
      console.log('[FactoryWatcher] Using WebSocket - setting up contract.on() listeners');
      for (const factory of this.factories) {
        const filter = factory.contract.filters.PairCreated();

        // Listen for new events (this is the live listening part)
        factory.contract.on(filter, async (token0, token1, pair, eventLog) => {
          try {
            // Extract event data - ethers.js provides the event log as the last argument
            const event = eventLog?.log || eventLog;
            const block = await this.provider.getBlock('latest');

            const pairEvent: PairCreatedEvent = {
              token0: ethers.getAddress(token0),
              token1: ethers.getAddress(token1),
              pair: ethers.getAddress(pair),
              blockNumber: event?.blockNumber || block?.number || 0,
              transactionHash: event?.transactionHash || event?.hash || '',
              timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
              factoryVersion: factory.version,
            };

            // Get timestamp from the actual block where the event occurred
            if (pairEvent.blockNumber > 0) {
              try {
                const eventBlock = await this.provider.getBlock(pairEvent.blockNumber);
                if (eventBlock) {
                  pairEvent.timestamp = eventBlock.timestamp;
                }
              } catch (error) {
                console.warn(`Could not fetch block ${pairEvent.blockNumber} for timestamp`);
              }
            }

            console.log(`[FactoryWatcher] 🎉 NEW PAIR detected from ${factory.version} factory:`, {
              pair: pairEvent.pair,
              token0: pairEvent.token0,
              token1: pairEvent.token1,
              block: pairEvent.blockNumber,
            });

            callback(pairEvent);
          } catch (error) {
            console.error(`Error processing PairCreated event from ${factory.version} factory:`, error);
          }
        });

        this.listeners.set(factory.address, callback);
        console.log(`[FactoryWatcher] ✅ WebSocket listener active for ${factory.version} factory (${factory.address})`);
      }
    } else {
      // HTTP: Use manual polling with queryFilter
      console.log('[FactoryWatcher] Using HTTP - setting up polling listener (every 5 seconds)');

      // Get current block to start polling from
      this.lastCheckedBlock = await this.provider.getBlockNumber();

      // Poll for new events every 5 seconds
      const pollForNewEvents = async () => {
        try {
          const currentBlock = await this.provider.getBlockNumber();

          // Only check if there are new blocks
          if (currentBlock > this.lastCheckedBlock) {
            const fromBlock = this.lastCheckedBlock + 1;

            // Query each factory for new events
            for (const factory of this.factories) {
              try {
                const filter = factory.contract.filters.PairCreated();
                const events = await factory.contract.queryFilter(filter, fromBlock, currentBlock);

                // Process each new event
                for (const event of events) {
                  if (event && event.args) {
                    const pairEvent = await this.parsePairCreatedEvent(event, factory.version);

                    console.log(`[FactoryWatcher] 🎉 NEW PAIR detected from ${factory.version} factory:`, {
                      pair: pairEvent.pair,
                      token0: pairEvent.token0,
                      token1: pairEvent.token1,
                      block: pairEvent.blockNumber,
                    });

                    callback(pairEvent);
                  }
                }
              } catch (error) {
                console.error(`Error polling ${factory.version} factory:`, error);
              }
            }

            this.lastCheckedBlock = currentBlock;
          }
        } catch (error) {
          console.error('[FactoryWatcher] Error in polling loop:', error);
        }
      };

      // Run initial poll
      pollForNewEvents();

      // Set up interval
      this.pollInterval = setInterval(pollForNewEvents, 5000); // Poll every 5 seconds

      for (const factory of this.factories) {
        this.listeners.set(factory.address, callback);
        console.log(`[FactoryWatcher] ✅ HTTP polling listener active for ${factory.version} factory (${factory.address})`);
      }
    }
  }

  /**
   * Parse PairCreated event into structured format
   */
  private async parsePairCreatedEvent(
    event: ethers.Log | ethers.EventLog,
    version: 'v1' | 'v2'
  ): Promise<PairCreatedEvent> {
    if (!event.args || event.args.length < 3) {
      throw new Error('Invalid PairCreated event: missing arguments');
    }

    const block = await this.provider.getBlock(event.blockNumber);

    return {
      token0: ethers.getAddress(event.args[0]),
      token1: ethers.getAddress(event.args[1]),
      pair: ethers.getAddress(event.args[2]),
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
      factoryVersion: version,
    };
  }

  /**
   * Stop listening for events
   */
  stopListening(): void {
    if (!this.isListening) {
      return;
    }

    console.log('[FactoryWatcher] Stopping event listeners...');

    // Clear polling interval if exists
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    for (const factory of this.factories) {
      factory.contract.removeAllListeners();
    }
    this.listeners.clear();
    this.isListening = false;

    // Close WebSocket connection if applicable
    // Note: We skip destroy() to avoid errors when WebSocket isn't fully connected
    // The connection will close naturally when the provider is garbage collected
    if (this.provider instanceof ethers.WebSocketProvider) {
      // Try to safely close the connection, but don't throw if it fails
      process.nextTick(() => {
        try {
          const ws = (this.provider as unknown as { _websocket?: { readyState?: number } })._websocket;
          
          // Only attempt destroy if WebSocket exists and is in a valid state (OPEN or CLOSING)
          // Skip if CONNECTING (0) or CLOSED (3) to avoid "closed before connection established" errors
          if (ws && ws.readyState === 1) { // Only if OPEN (1)
            const destroyPromise = this.provider.destroy();
            if (destroyPromise && typeof destroyPromise.catch === 'function') {
              destroyPromise.catch(() => {
                // Silently ignore - connection may have already closed
              });
            }
          }
        } catch {
          // Silently ignore all errors - prevents uncaught exceptions
        }
      });
    }
  }

  /**
   * Check if currently listening for events
   */
  get listening(): boolean {
    return this.isListening;
  }

  /**
   * Check if using WebSocket (true live events) or HTTP (polling)
   */
  get isLive(): boolean {
    return this.provider instanceof ethers.WebSocketProvider;
  }

  /**
   * Get recent pairs (last N blocks)
   */
  async getRecentPairs(blockRange: number = 1000): Promise<PairCreatedEvent[]> {
    const currentBlock = await this.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - blockRange);

    const allPairs: PairCreatedEvent[] = [];

    for (const factory of this.factories) {
      try {
        const filter = factory.contract.filters.PairCreated();
        const events = await factory.contract.queryFilter(filter, fromBlock, 'latest');

        for (const event of events) {
          if (event && event.args) {
            const pairEvent = await this.parsePairCreatedEvent(event, factory.version);
            allPairs.push(pairEvent);
          }
        }
      } catch (error) {
        console.error(`Error fetching pairs from ${factory.version} factory:`, error);
      }
    }

    // Sort by block number (newest first)
    return allPairs.sort((a, b) => b.blockNumber - a.blockNumber);
  }
}

