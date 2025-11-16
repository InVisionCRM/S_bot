/**
 * Price Monitor
 * Monitors token prices for limit order execution
 */

import { ethers } from 'ethers';
import type { PriceUpdate, LimitOrder } from '@/types/sniper';
import { PULSEX_CONFIG, PULSEX_ROUTER_ABI } from '@/config/sniper';
import { createPulseChainProvider } from '@/lib/blockchain/provider';

/**
 * Price monitoring service for limit orders
 */
export class PriceMonitor {
  private provider: ethers.JsonRpcProvider;
  private routerContract: ethers.Contract;
  private monitoredTokens: Set<string> = new Set();
  private priceCache: Map<string, PriceUpdate> = new Map();
  private limitOrders: Map<string, LimitOrder> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  // Callbacks
  private onPriceUpdateCallback?: (update: PriceUpdate) => void;
  private onLimitOrderTriggeredCallback?: (order: LimitOrder, price: string) => void;

  constructor(provider?: ethers.JsonRpcProvider) {
    this.provider = provider || createPulseChainProvider();
    this.routerContract = new ethers.Contract(
      PULSEX_CONFIG.routerV2,
      PULSEX_ROUTER_ABI,
      this.provider
    );
  }

  /**
   * Start price monitoring
   */
  start(intervalMs: number = 10000): void {
    if (this.isRunning) {
      console.warn('[PriceMonitor] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[PriceMonitor] Starting price monitoring (interval: ${intervalMs}ms)`);

    // Run initial check
    this.checkPrices();

    // Set up interval
    this.pollInterval = setInterval(() => {
      this.checkPrices();
    }, intervalMs);
  }

  /**
   * Stop price monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    console.log('[PriceMonitor] Stopped price monitoring');
  }

  /**
   * Add token to monitor
   */
  addToken(tokenAddress: string): void {
    this.monitoredTokens.add(tokenAddress.toLowerCase());
    console.log('[PriceMonitor] Added token to monitor:', tokenAddress);
  }

  /**
   * Remove token from monitoring
   */
  removeToken(tokenAddress: string): void {
    this.monitoredTokens.delete(tokenAddress.toLowerCase());
    this.priceCache.delete(tokenAddress.toLowerCase());
    console.log('[PriceMonitor] Removed token from monitoring:', tokenAddress);
  }

  /**
   * Add limit order
   */
  addLimitOrder(order: LimitOrder): void {
    this.limitOrders.set(order.id, order);
    this.addToken(order.tokenAddress);
    console.log('[PriceMonitor] Added limit order:', order);
  }

  /**
   * Remove limit order
   */
  removeLimitOrder(orderId: string): void {
    this.limitOrders.delete(orderId);
    console.log('[PriceMonitor] Removed limit order:', orderId);
  }

  /**
   * Get current price for token
   */
  async getPrice(tokenAddress: string): Promise<string> {
    try {
      // Get token decimals
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function decimals() view returns (uint8)'],
        this.provider
      );

      const decimals = await tokenContract.decimals();
      const amountIn = ethers.parseUnits('1', decimals);

      // Build path: Token -> WPLS
      const path = [tokenAddress, PULSEX_CONFIG.WPLS];

      // Get amounts out
      const amounts = await this.routerContract.getAmountsOut(amountIn, path);
      const pricePLS = ethers.formatEther(amounts[1]);

      return pricePLS;
    } catch (error) {
      console.error('[PriceMonitor] Error getting price for', tokenAddress, error);
      return '0';
    }
  }

  /**
   * Get cached price
   */
  getCachedPrice(tokenAddress: string): PriceUpdate | undefined {
    return this.priceCache.get(tokenAddress.toLowerCase());
  }

  /**
   * Check prices for all monitored tokens
   */
  private async checkPrices(): Promise<void> {
    if (this.monitoredTokens.size === 0) {
      return;
    }

    for (const tokenAddress of this.monitoredTokens) {
      try {
        const price = await this.getPrice(tokenAddress);

        const update: PriceUpdate = {
          tokenAddress,
          pricePLS: price,
          timestamp: Date.now(),
          reserveToken: '0', // Could fetch from pair contract if needed
          reservePLS: '0',
        };

        this.priceCache.set(tokenAddress.toLowerCase(), update);

        // Notify callback
        if (this.onPriceUpdateCallback) {
          this.onPriceUpdateCallback(update);
        }

        // Check limit orders
        await this.checkLimitOrders(tokenAddress, price);
      } catch (error) {
        console.error('[PriceMonitor] Error checking price for', tokenAddress, error);
      }
    }
  }

  /**
   * Check if any limit orders should be triggered
   */
  private async checkLimitOrders(tokenAddress: string, currentPrice: string): Promise<void> {
    const orders = Array.from(this.limitOrders.values()).filter(
      (o) => o.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() && o.status === 'pending'
    );

    for (const order of orders) {
      const targetPrice = parseFloat(order.targetPricePLS);
      const price = parseFloat(currentPrice);

      let shouldTrigger = false;

      if (order.orderType === 'take_profit') {
        // Trigger if current price >= target price
        shouldTrigger = price >= targetPrice;
      } else if (order.orderType === 'stop_loss') {
        // Trigger if current price <= target price
        shouldTrigger = price <= targetPrice;
      }

      if (shouldTrigger) {
        console.log('[PriceMonitor] 🎯 Limit order triggered:', {
          orderId: order.id,
          type: order.orderType,
          targetPrice: order.targetPricePLS,
          currentPrice,
        });

        // Notify callback
        if (this.onLimitOrderTriggeredCallback) {
          this.onLimitOrderTriggeredCallback(order, currentPrice);
        }

        // Update order status
        order.status = 'executed';
        order.executedAt = Date.now();
        this.limitOrders.set(order.id, order);
      }
    }
  }

  /**
   * Get all limit orders
   */
  getLimitOrders(): LimitOrder[] {
    return Array.from(this.limitOrders.values());
  }

  /**
   * Get pending limit orders
   */
  getPendingLimitOrders(): LimitOrder[] {
    return this.getLimitOrders().filter((o) => o.status === 'pending');
  }

  /**
   * Set callback for price updates
   */
  onPriceUpdate(callback: (update: PriceUpdate) => void): void {
    this.onPriceUpdateCallback = callback;
  }

  /**
   * Set callback for limit order triggers
   */
  onLimitOrderTriggered(callback: (order: LimitOrder, price: string) => void): void {
    this.onLimitOrderTriggeredCallback = callback;
  }

  /**
   * Get running status
   */
  get running(): boolean {
    return this.isRunning;
  }
}
