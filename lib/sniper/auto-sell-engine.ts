/**
 * Auto-Sell Engine
 * Executes limit orders when price targets are hit
 */

import type { LimitOrder, TokenPosition } from '@/types/sniper';
import { SniperEngine } from './sniper-engine';
import { PriceMonitor } from './price-monitor';
import { PortfolioService } from './portfolio-service';

/**
 * Auto-sell engine for executing limit orders
 */
export class AutoSellEngine {
  private sniperEngine: SniperEngine;
  private priceMonitor: PriceMonitor;
  private portfolioService: PortfolioService;
  private isRunning: boolean = false;

  // Callbacks
  private onSellCallback?: (position: TokenPosition, order: LimitOrder) => void;

  constructor(
    sniperEngine: SniperEngine,
    priceMonitor: PriceMonitor,
    portfolioService: PortfolioService
  ) {
    this.sniperEngine = sniperEngine;
    this.priceMonitor = priceMonitor;
    this.portfolioService = portfolioService;

    // Listen for limit order triggers from price monitor
    this.priceMonitor.onLimitOrderTriggered((order, currentPrice) => {
      this.executeLimitOrder(order, currentPrice);
    });
  }

  /**
   * Start auto-sell engine
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[AutoSellEngine] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[AutoSellEngine] Auto-sell engine started');

    // Start price monitor if not already running
    if (!this.priceMonitor.running) {
      this.priceMonitor.start(10000); // Check prices every 10 seconds
    }

    // Add all holding positions to price monitor
    const holdings = this.portfolioService.getHoldingPositions();
    for (const position of holdings) {
      this.priceMonitor.addToken(position.tokenAddress);
    }
  }

  /**
   * Stop auto-sell engine
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('[AutoSellEngine] Auto-sell engine stopped');

    // Note: We don't stop the price monitor here because
    // it might be used for other purposes (displaying prices)
  }

  /**
   * Create limit order for a position
   */
  createLimitOrder(
    tokenAddress: string,
    orderType: 'take_profit' | 'stop_loss',
    targetPricePLS: string,
    amountTokens?: string
  ): LimitOrder {
    const position = this.portfolioService.getPosition(tokenAddress);
    if (!position) {
      throw new Error('No position found for token');
    }

    const order: LimitOrder = {
      id: `${tokenAddress}-${orderType}-${Date.now()}`,
      tokenAddress,
      orderType,
      targetPricePLS,
      amountTokens: amountTokens || position.amountTokens,
      slippagePercent: this.sniperEngine.getConfig().slippagePercent,
      createdAt: Date.now(),
      status: 'pending',
    };

    this.priceMonitor.addLimitOrder(order);

    console.log('[AutoSellEngine] Created limit order:', order);

    return order;
  }

  /**
   * Create auto limit orders based on config
   */
  createAutoLimitOrders(position: TokenPosition): void {
    const config = this.sniperEngine.getConfig();

    if (!config.autoSellEnabled) {
      return;
    }

    const buyPrice = parseFloat(position.buyPricePLS);

    // Create take profit order if configured
    if (config.takeProfitPercent) {
      const targetPrice = buyPrice * (1 + config.takeProfitPercent / 100);
      this.createLimitOrder(
        position.tokenAddress,
        'take_profit',
        targetPrice.toString(),
        position.amountTokens
      );

      console.log('[AutoSellEngine] Created take profit order:', {
        token: position.tokenAddress,
        buyPrice,
        targetPrice,
        profitPercent: config.takeProfitPercent,
      });
    }

    // Create stop loss order if configured
    if (config.stopLossPercent) {
      const targetPrice = buyPrice * (1 - config.stopLossPercent / 100);
      this.createLimitOrder(
        position.tokenAddress,
        'stop_loss',
        targetPrice.toString(),
        position.amountTokens
      );

      console.log('[AutoSellEngine] Created stop loss order:', {
        token: position.tokenAddress,
        buyPrice,
        targetPrice,
        lossPercent: config.stopLossPercent,
      });
    }
  }

  /**
   * Execute limit order (called when price target is hit)
   */
  private async executeLimitOrder(order: LimitOrder, currentPrice: string): Promise<void> {
    try {
      console.log('[AutoSellEngine] 🎯 Executing limit order:', {
        orderId: order.id,
        type: order.orderType,
        targetPrice: order.targetPricePLS,
        currentPrice,
      });

      const position = this.portfolioService.getPosition(order.tokenAddress);
      if (!position) {
        throw new Error('Position not found');
      }

      // Execute sell via sniper engine
      const txResponse = await this.sniperEngine.sellToken(
        order.tokenAddress,
        order.amountTokens
      );

      console.log('[AutoSellEngine] ✅ Limit order executed:', {
        orderId: order.id,
        txHash: txResponse.hash,
      });

      // Update order with transaction hash
      order.transactionHash = txResponse.hash;
      order.executedAt = Date.now();
      order.status = 'executed';

      // Update position
      position.sellPricePLS = currentPrice;
      position.sellTimestamp = Date.now();
      position.sellTransactionHash = txResponse.hash;
      position.status = 'sold';

      // Calculate P/L
      const buyPrice = parseFloat(position.buyPricePLS);
      const sellPrice = parseFloat(currentPrice);
      position.profitLossPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

      this.portfolioService.updatePosition(order.tokenAddress, position);

      // Notify callback
      if (this.onSellCallback) {
        this.onSellCallback(position, order);
      }

      // Remove token from price monitoring
      this.priceMonitor.removeToken(order.tokenAddress);
    } catch (error) {
      console.error('[AutoSellEngine] ❌ Failed to execute limit order:', error);

      // Mark order as failed
      order.status = 'failed';
      order.executedAt = Date.now();
    }
  }

  /**
   * Cancel limit order
   */
  cancelLimitOrder(orderId: string): void {
    this.priceMonitor.removeLimitOrder(orderId);
    console.log('[AutoSellEngine] Cancelled limit order:', orderId);
  }

  /**
   * Get all limit orders
   */
  getLimitOrders(): LimitOrder[] {
    return this.priceMonitor.getLimitOrders();
  }

  /**
   * Get pending limit orders
   */
  getPendingLimitOrders(): LimitOrder[] {
    return this.priceMonitor.getPendingLimitOrders();
  }

  /**
   * Set callback for sell execution
   */
  onSell(callback: (position: TokenPosition, order: LimitOrder) => void): void {
    this.onSellCallback = callback;
  }

  /**
   * Get running status
   */
  get running(): boolean {
    return this.isRunning;
  }
}
