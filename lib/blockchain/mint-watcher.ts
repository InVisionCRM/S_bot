/**
 * Mint Event Watcher
 * Monitors Transfer events from zero address (0x000...000) to detect token mints
 * Specifically watches for mints to the configured watched address
 */

import { ethers } from 'ethers';
import { PULSECHAIN_CONFIG, ERC20_ABI } from '@/config/pulsechain';
import type { MintEvent } from '@/types/mint-events';
import { getServerProvider, createPulseChainProviderWithWebSocket } from './provider';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Mint event watcher service
 * Listens for Transfer events from zero address (minting)
 */
export class MintWatcher {
  private provider: ethers.JsonRpcProvider | ethers.WebSocketProvider;
  private watchedAddress: string;
  private isListening: boolean = false;
  private listeners: Map<string, (event: MintEvent) => void> = new Map();
  private tokenContracts: Map<string, ethers.Contract> = new Map();

  constructor(
    provider?: ethers.JsonRpcProvider | ethers.WebSocketProvider,
    useWebSocket?: boolean,
    watchedAddress?: string
  ) {
    // Use WebSocket for live events if requested
    if (useWebSocket) {
      this.provider = provider || createPulseChainProviderWithWebSocket();
    } else {
      this.provider = provider || getServerProvider();
    }
    
    this.watchedAddress = ethers.getAddress(
      watchedAddress || PULSECHAIN_CONFIG.watchedAddress
    );
  }

  /**
   * Start listening for mint events (Transfer from zero address)
   * 
   * This monitors ALL ERC20 Transfer events from zero address across the network
   * and filters for the watched address
   * 
   * @param callback Function to call when mint events are detected
   * @param fromBlock Optional: block number to start from (for historical events)
   * @param includeHistorical Whether to fetch and process historical events on startup
   * @param tokenAddress Optional: specific token to watch (if not provided, watches all tokens)
   */
  async startListening(
    callback: (event: MintEvent) => void,
    fromBlock?: number,
    includeHistorical: boolean = true,
    tokenAddress?: string
  ): Promise<void> {
    if (this.isListening) {
      console.warn('MintWatcher is already listening. Stop first before starting again.');
      return;
    }

    this.isListening = true;
    const providerType = this.provider instanceof ethers.WebSocketProvider ? 'WebSocket' : 'HTTP';
    console.log(`[MintWatcher] Starting mint event listener (${providerType} provider)...`);
    console.log(`[MintWatcher] Watching address: ${this.watchedAddress}`);

    // Create Transfer event filter for transfers FROM zero address TO watched address
    const transferFilter = {
      from: ZERO_ADDRESS,
      to: this.watchedAddress,
    };

    if (includeHistorical) {
      const startBlock = fromBlock || (await this.provider.getBlockNumber()) - 1000;

      if (tokenAddress) {
        // Watch specific token
        await this.watchToken(tokenAddress, callback, startBlock, true);
      } else {
        // Watch all tokens by subscribing to Transfer events network-wide
        // This is more complex - we'll query for recent mints and then monitor going forward
        const recentMints = await this.getRecentMints(startBlock);
        console.log(`[MintWatcher] Found ${recentMints.length} historical mint events`);
        for (const mint of recentMints) {
          callback(mint);
        }
      }
    }

    // Set up live event listener using eth_newFilter (works with both HTTP and WS)
    // Note: ethers.js doesn't have direct support for eth_newFilter subscriptions
    // We'll use a polling approach or WebSocket if available

    if (tokenAddress) {
      // Watch specific token
      await this.watchToken(tokenAddress, callback, undefined, false);
      console.log(`[MintWatcher] ✅ Live listener active for token ${tokenAddress}`);
    } else {
      // For network-wide monitoring, we use block polling to check for Transfer events
      // from zero address to watched address
      console.log('[MintWatcher] Setting up network-wide mint monitoring via block polling...');
      this.setupNetworkWideListener(callback);
      console.log('[MintWatcher] ✅ Network-wide mint listener active (polling every 3 seconds)');
    }
  }

  /**
   * Watch a specific token contract for mint events
   */
  private async watchToken(
    tokenAddress: string,
    callback: (event: MintEvent) => void,
    fromBlock?: number,
    includeHistorical: boolean = false
  ): Promise<void> {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    this.tokenContracts.set(tokenAddress, tokenContract);

    // Create filter for Transfer from zero address to watched address
    const filter = tokenContract.filters.Transfer(ZERO_ADDRESS, this.watchedAddress);

    if (includeHistorical && fromBlock !== undefined) {
      try {
        const events = await tokenContract.queryFilter(filter, fromBlock, 'latest');
        for (const event of events) {
          if (event && event.args && event.args.length >= 3) {
            const mintEvent = await this.parseTransferEvent(event, tokenAddress);
            callback(mintEvent);
          }
        }
      } catch (error) {
        console.error(`Error fetching historical mints for token ${tokenAddress}:`, error);
      }
    }

    // Different approach for WebSocket vs HTTP
    const isWebSocket = this.provider instanceof ethers.WebSocketProvider;

    if (isWebSocket) {
      // WebSocket: Use contract.on() for true real-time events
      tokenContract.on(filter, async (from, to, value, eventLog) => {
        try {
          const event = eventLog?.log || eventLog;
          const block = await this.provider.getBlock('latest');

          const mintEvent: MintEvent = {
            token: tokenAddress,
            to: ethers.getAddress(to),
            amount: value.toString(),
            blockNumber: event?.blockNumber || block?.number || 0,
            transactionHash: event?.transactionHash || event?.hash || '',
            timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
            logIndex: event?.index || 0,
          };

          if (mintEvent.blockNumber > 0) {
            try {
              const eventBlock = await this.provider.getBlock(mintEvent.blockNumber);
              if (eventBlock) {
                mintEvent.timestamp = eventBlock.timestamp;
              }
            } catch (error) {
              console.warn(`Could not fetch block ${mintEvent.blockNumber} for timestamp`);
            }
          }

          console.log(`[MintWatcher] 🎉 NEW MINT detected:`, {
            token: mintEvent.token,
            to: mintEvent.to,
            amount: mintEvent.amount,
            block: mintEvent.blockNumber,
          });

          callback(mintEvent);
        } catch (error) {
          console.error(`Error processing mint event for token ${tokenAddress}:`, error);
        }
      });
    } else {
      // HTTP: token.on() won't work without eth_newFilter support
      // Instead, this will be handled by network-wide polling
      console.log(`[MintWatcher] HTTP mode - specific token watching not supported, use network-wide monitoring`);
    }

    this.listeners.set(tokenAddress, callback);
  }

  /**
   * Set up network-wide listener by polling blocks for Transfer events
   * This monitors all Transfer events from zero address
   */
  private setupNetworkWideListener(callback: (event: MintEvent) => void): void {
    console.log('[MintWatcher] Setting up network-wide mint monitoring...');
    
    // For network-wide monitoring, we'll use block polling
    // This checks new blocks for Transfer events from zero address
    
    let lastCheckedBlock = 0;
    
    const checkNewBlocks = async () => {
      try {
        const currentBlock = await this.provider.getBlockNumber();
        
        if (lastCheckedBlock === 0) {
          lastCheckedBlock = currentBlock - 1;
        }

        if (currentBlock > lastCheckedBlock) {
          // Check blocks for Transfer events from zero address to watched address
          for (let blockNum = lastCheckedBlock + 1; blockNum <= currentBlock; blockNum++) {
            try {
              const block = await this.provider.getBlock(blockNum, true);
              if (block && block.transactions) {
                for (const tx of block.transactions) {
                  if (typeof tx === 'object' && tx.logs) {
                    for (const log of tx.logs) {
                      // Check if this is a Transfer event from zero address to watched address
                      if (
                        log.topics &&
                        log.topics.length >= 3 &&
                        log.topics[0] === ethers.id('Transfer(address,address,uint256)') &&
                        log.topics[1] === ethers.zeroPadValue(ZERO_ADDRESS, 32) &&
                        log.topics[2] === ethers.zeroPadValue(this.watchedAddress, 32)
                      ) {
                        const mintEvent: MintEvent = {
                          token: log.address,
                          to: this.watchedAddress,
                          amount: ethers.dataSlice(log.data, 0), // Decode the value
                          blockNumber: blockNum,
                          transactionHash: tx.hash,
                          timestamp: block.timestamp,
                          logIndex: log.index || 0,
                        };

                        // Decode amount properly
                        try {
                          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], log.data);
                          mintEvent.amount = decoded[0].toString();
                        } catch (e) {
                          // Keep raw data if decode fails
                        }

                        callback(mintEvent);
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`Error checking block ${blockNum}:`, error);
            }
          }
          
          lastCheckedBlock = currentBlock;
        }
      } catch (error) {
        console.error('Error in block polling:', error);
      }
    };

    // Poll every 3 seconds (faster than block time for PulseChain)
    const pollInterval = setInterval(checkNewBlocks, 3000);
    
    // Store interval for cleanup
    (this as unknown as { pollInterval?: NodeJS.Timeout }).pollInterval = pollInterval;
  }

  /**
   * Get recent mint events from historical blocks
   */
  async getRecentMints(blockRange: number = 1000): Promise<MintEvent[]> {
    const currentBlock = await this.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - blockRange);
    const mints: MintEvent[] = [];

    // Query logs for Transfer events from zero address to watched address
    const filter = {
      fromBlock,
      toBlock: 'latest' as const,
      topics: [
        ethers.id('Transfer(address,address,uint256)'),
        ethers.zeroPadValue(ZERO_ADDRESS, 32), // from = zero address
        ethers.zeroPadValue(this.watchedAddress, 32), // to = watched address
      ],
    };

    try {
      const logs = await this.provider.getLogs(filter);
      
      for (const log of logs) {
        try {
          // Decode the amount
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], log.data);
          const block = await this.provider.getBlock(log.blockNumber);

          const mintEvent: MintEvent = {
            token: log.address,
            to: this.watchedAddress,
            amount: decoded[0].toString(),
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
            logIndex: log.index || 0,
          };

          mints.push(mintEvent);
        } catch (error) {
          console.error('Error parsing mint log:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching recent mints:', error);
    }

    // Sort by block number (newest first)
    return mints.sort((a, b) => b.blockNumber - a.blockNumber);
  }

  /**
   * Parse Transfer event into MintEvent format
   */
  private async parseTransferEvent(
    event: ethers.Log | ethers.EventLog,
    tokenAddress: string
  ): Promise<MintEvent> {
    if (!event.args || event.args.length < 3) {
      throw new Error('Invalid Transfer event: missing arguments');
    }

    const block = await this.provider.getBlock(event.blockNumber);

    return {
      token: tokenAddress,
      to: ethers.getAddress(event.args[1]),
      amount: event.args[2].toString(),
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
      logIndex: event.index || 0,
    };
  }

  /**
   * Stop listening for events
   */
  stopListening(): void {
    if (!this.isListening) {
      return;
    }

    console.log('[MintWatcher] Stopping event listeners...');
    
    // Remove listeners from token contracts
    for (const [tokenAddress, contract] of this.tokenContracts.entries()) {
      contract.removeAllListeners();
    }
    this.tokenContracts.clear();
    this.listeners.clear();
    
    // Clear polling interval if set
    const pollInterval = (this as unknown as { pollInterval?: NodeJS.Timeout }).pollInterval;
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    
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
}

