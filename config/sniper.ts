/**
 * Sniper Bot Configuration
 * Default settings for the Pump.tires sniper bot
 */

import type { SniperConfig } from '@/types/sniper';

/**
 * Default sniper configuration
 */
export const DEFAULT_SNIPER_CONFIG: SniperConfig = {
  // Auto-buy settings (disabled by default for safety)
  autoBuyEnabled: false,
  buyAmountPLS: '100', // 100 PLS per snipe
  slippagePercent: 10, // 10% slippage
  gasLimitMultiplier: 1.2, // 120% of estimated gas
  gasPriceGwei: undefined, // Use network default

  // Auto-sell settings (disabled by default)
  autoSellEnabled: false,
  takeProfitPercent: 100, // Sell at 2x (100% profit)
  stopLossPercent: 50, // Sell at -50% loss

  // Filters
  minBuyEnabled: false, // Don't wait for other buyers
  minBuyCount: 1,
};

/**
 * PulseX Router Configuration
 */
export const PULSEX_CONFIG = {
  // PulseX V2 Router (most commonly used)
  routerV2: '0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02' as const,

  // PulseX V1 Router (fallback)
  routerV1: '0xDaE9dd3d1A52CfCe9d5F2fAC7fDe164D500E50f7' as const,

  // WPLS (Wrapped PLS) - used for swaps
  WPLS: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27' as const,

  // Deadline buffer (seconds from now)
  deadlineBuffer: 300, // 5 minutes
};

/**
 * PulseX Router ABI (minimal for swaps)
 */
export const PULSEX_ROUTER_ABI = [
  // Swap exact PLS for tokens
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',

  // Swap exact tokens for PLS
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',

  // Get amounts out (for price estimation)
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',

  // Get amounts in (for price estimation)
  'function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)',

  // WETH/WPLS address
  'function WETH() external pure returns (address)',
] as const;

/**
 * Pump.tires Contract Address
 * This is the address that receives token mints
 */
export const PUMP_TIRES_CONTRACT = '0x6538A83a81d855B965983161AF6a83e616D16fD5' as const;

/**
 * Sniper bot settings storage key
 */
export const SNIPER_STORAGE_KEY = 'pulsechain-sniper-config';

/**
 * Portfolio storage key
 */
export const PORTFOLIO_STORAGE_KEY = 'pulsechain-sniper-portfolio';

/**
 * Limit orders storage key
 */
export const LIMIT_ORDERS_STORAGE_KEY = 'pulsechain-sniper-limit-orders';
