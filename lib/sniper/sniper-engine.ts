/**
 * Sniper Engine
 * Automated token buying engine for Pump.tires launches
 */

import { ethers } from 'ethers';
import type { MintEvent } from '@/types/mint-events';
import type { SniperConfig, SnipeResult, TokenPosition } from '@/types/sniper';
import { PUMP_TIRES_CONTRACT } from '@/config/sniper';
import { WalletService } from './wallet-service';
import { SwapService } from './swap-service';
import { getTokenInfo } from '@/lib/blockchain/token-info';

/**
 * Sniper engine for automated token buying
 */
export class SniperEngine {
  private walletService: WalletService;
  private swapService: SwapService | null = null;
  private config: SniperConfig;
  private isRunning: boolean = false;
  private positions: Map<string, TokenPosition> = new Map();

  // Callbacks
  private onSnipeCallback?: (result: SnipeResult) => void;
  private onPositionUpdateCallback?: (position: TokenPosition) => void;

  constructor(config: SniperConfig) {
    this.config = config;
    this.walletService = new WalletService();
  }

  /**
   * Initialize sniper with private key
   */
  initialize(privateKey: string): void {
    try {
      this.walletService.initializeWallet(privateKey);
      this.swapService = new SwapService(this.walletService);
      console.log('[SniperEngine] Initialized with wallet:', this.walletService.getAddress());
    } catch (error) {
      console.error('[SniperEngine] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start sniper engine
   */
  start(): void {
    if (!this.walletService.isInitialized()) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    this.isRunning = true;
    console.log('[SniperEngine] Sniper engine started', {
      autoBuyEnabled: this.config.autoBuyEnabled,
      buyAmount: `${this.config.buyAmountPLS} PLS`,
      slippage: `${this.config.slippagePercent}%`,
    });
  }

  /**
   * Stop sniper engine
   */
  stop(): void {
    this.isRunning = false;
    console.log('[SniperEngine] Sniper engine stopped');
  }

  /**
   * Handle mint event (called when new Pump.tires token is detected)
   */
  async handleMintEvent(mintEvent: MintEvent): Promise<void> {
    // Only process if minted to Pump.tires contract
    if (mintEvent.to.toLowerCase() !== PUMP_TIRES_CONTRACT.toLowerCase()) {
      return;
    }

    console.log('[SniperEngine] 🎯 Pump.tires token detected:', {
      token: mintEvent.token,
      block: mintEvent.blockNumber,
      tx: mintEvent.transactionHash,
    });

    // Check if auto-buy is enabled
    if (!this.config.autoBuyEnabled || !this.isRunning) {
      console.log('[SniperEngine] Auto-buy disabled, skipping...');
      return;
    }

    // Execute snipe
    await this.executeSnipe(mintEvent.token);
  }

  /**
   * Execute token snipe (buy)
   */
  async executeSnipe(tokenAddress: string): Promise<SnipeResult> {
    const timestamp = Date.now();

    try {
      if (!this.swapService) {
        throw new Error('Swap service not initialized');
      }

      console.log('[SniperEngine] 🚀 Executing snipe:', {
        token: tokenAddress,
        amount: `${this.config.buyAmountPLS} PLS`,
        slippage: `${this.config.slippagePercent}%`,
      });

      // Get token info
      let tokenInfo;
      try {
        tokenInfo = await getTokenInfo(tokenAddress);
      } catch (error) {
        console.warn('[SniperEngine] Could not fetch token info, proceeding anyway');
        tokenInfo = null;
      }

      // Execute buy
      const txResponse = await this.swapService.buyTokenWithPLS(
        tokenAddress,
        this.config.buyAmountPLS,
        this.config.slippagePercent,
        this.config.gasLimitMultiplier,
        this.config.gasPriceGwei
      );

      console.log('[SniperEngine] ✅ Snipe transaction sent:', txResponse.hash);

      // Wait for confirmation
      const receipt = await this.walletService.waitForTransaction(txResponse.hash, 1);

      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      // Get token balance to see how much we received
      const tokenBalance = await this.walletService.getTokenBalance(tokenAddress);

      // Create position
      const position: TokenPosition = {
        tokenAddress,
        tokenSymbol: tokenInfo?.symbol || 'UNKNOWN',
        tokenName: tokenInfo?.name || 'Unknown Token',
        buyTransactionHash: txResponse.hash,
        buyTimestamp: timestamp,
        buyPricePLS: this.config.buyAmountPLS,
        amountTokens: tokenBalance,
        status: 'holding',
      };

      this.positions.set(tokenAddress, position);

      // Notify callback
      if (this.onPositionUpdateCallback) {
        this.onPositionUpdateCallback(position);
      }

      const result: SnipeResult = {
        success: true,
        tokenAddress,
        transactionHash: txResponse.hash,
        amountSpentPLS: this.config.buyAmountPLS,
        amountReceived: tokenBalance,
        timestamp,
      };

      console.log('[SniperEngine] 💰 Snipe successful:', result);

      if (this.onSnipeCallback) {
        this.onSnipeCallback(result);
      }

      return result;
    } catch (error) {
      console.error('[SniperEngine] ❌ Snipe failed:', error);

      const result: SnipeResult = {
        success: false,
        tokenAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
      };

      if (this.onSnipeCallback) {
        this.onSnipeCallback(result);
      }

      return result;
    }
  }

  /**
   * Sell tokens manually
   */
  async sellToken(tokenAddress: string, amount?: string): Promise<ethers.TransactionResponse> {
    if (!this.swapService) {
      throw new Error('Swap service not initialized');
    }

    const position = this.positions.get(tokenAddress);
    const amountToSell = amount || position?.amountTokens;

    if (!amountToSell) {
      throw new Error('No position found for token');
    }

    console.log('[SniperEngine] Selling token:', {
      token: tokenAddress,
      amount: amountToSell,
    });

    const txResponse = await this.swapService.sellTokenForPLS(
      tokenAddress,
      amountToSell,
      this.config.slippagePercent,
      this.config.gasLimitMultiplier,
      this.config.gasPriceGwei
    );

    // Wait for confirmation
    const receipt = await this.walletService.waitForTransaction(txResponse.hash, 1);

    if (receipt && receipt.status === 1 && position) {
      // Update position
      position.status = 'sold';
      position.sellTransactionHash = txResponse.hash;
      position.sellTimestamp = Date.now();

      this.positions.set(tokenAddress, position);

      if (this.onPositionUpdateCallback) {
        this.onPositionUpdateCallback(position);
      }
    }

    return txResponse;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SniperConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[SniperEngine] Config updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): SniperConfig {
    return { ...this.config };
  }

  /**
   * Get all positions
   */
  getPositions(): TokenPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get position for specific token
   */
  getPosition(tokenAddress: string): TokenPosition | undefined {
    return this.positions.get(tokenAddress);
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string | null {
    return this.walletService.getAddress();
  }

  /**
   * Get PLS balance
   */
  async getBalance(): Promise<string> {
    return await this.walletService.getBalance();
  }

  /**
   * Set callback for snipe results
   */
  onSnipe(callback: (result: SnipeResult) => void): void {
    this.onSnipeCallback = callback;
  }

  /**
   * Set callback for position updates
   */
  onPositionUpdate(callback: (position: TokenPosition) => void): void {
    this.onPositionUpdateCallback = callback;
  }

  /**
   * Get running status
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get initialization status
   */
  get initialized(): boolean {
    return this.walletService.isInitialized();
  }
}
