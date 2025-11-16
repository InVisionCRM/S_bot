/**
 * Type definitions for mint events (Transfer from zero address)
 */

/**
 * Mint event data structure
 * Represents a Transfer event from address(0) - token minting
 */
export interface MintEvent {
  token: string;
  to: string;
  amount: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  logIndex: number;
}

/**
 * Enriched mint event with token information
 */
export interface MintEventInfo extends MintEvent {
  tokenInfo: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply?: string;
  };
  formattedAmount: string;
  isWatchedAddress: boolean;
}

