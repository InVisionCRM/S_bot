/**
 * Sniper Bot Types
 * Types for automated token sniping on Pump.tires
 */

/**
 * Sniper configuration
 */
export interface SniperConfig {
  // Auto-buy settings
  autoBuyEnabled: boolean;
  buyAmountPLS: string; // Amount in PLS to spend per snipe
  slippagePercent: number; // Slippage tolerance (e.g., 10 for 10%)
  gasLimitMultiplier: number; // Gas limit multiplier (e.g., 1.2 for 120%)
  gasPriceGwei?: string; // Optional custom gas price in Gwei

  // Auto-sell settings
  autoSellEnabled: boolean;
  takeProfitPercent?: number; // Sell when profit reaches this % (e.g., 100 for 2x)
  stopLossPercent?: number; // Sell when loss reaches this % (e.g., 50 for -50%)

  // Filters
  minBuyEnabled: boolean; // Only buy if other buyers detected
  minBuyCount?: number; // Minimum number of other buyers before sniping
}

/**
 * Token position in portfolio
 */
export interface TokenPosition {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  buyTransactionHash: string;
  buyTimestamp: number;
  buyPricePLS: string; // Price paid in PLS
  amountTokens: string; // Amount of tokens bought
  currentPricePLS?: string; // Current price in PLS
  profitLossPercent?: number; // Current P/L percentage
  sellTransactionHash?: string; // If sold
  sellTimestamp?: number; // When sold
  sellPricePLS?: string; // Price sold at
  status: 'holding' | 'sold' | 'failed';
}

/**
 * Snipe transaction result
 */
export interface SnipeResult {
  success: boolean;
  tokenAddress: string;
  transactionHash?: string;
  amountSpentPLS?: string;
  amountReceived?: string;
  error?: string;
  timestamp: number;
}

/**
 * Limit order for auto-sell
 */
export interface LimitOrder {
  id: string;
  tokenAddress: string;
  orderType: 'take_profit' | 'stop_loss';
  targetPricePLS: string; // Target price in PLS
  amountTokens: string; // Amount to sell
  slippagePercent: number;
  createdAt: number;
  executedAt?: number;
  transactionHash?: string;
  status: 'pending' | 'executed' | 'cancelled' | 'failed';
}

/**
 * Price update from monitoring
 */
export interface PriceUpdate {
  tokenAddress: string;
  pricePLS: string;
  timestamp: number;
  reserveToken: string;
  reservePLS: string;
}
