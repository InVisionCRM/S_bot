/**
 * Type definitions for blockchain contracts and events
 */

/**
 * PairCreated event data structure
 */
export interface PairCreatedEvent {
  token0: string;
  token1: string;
  pair: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  factoryVersion: 'v1' | 'v2';
}

/**
 * Token information
 */
export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

/**
 * Complete pair information
 */
export interface PairInfo extends PairCreatedEvent {
  token0Info: TokenInfo;
  token1Info: TokenInfo;
  watchedAddressInvolvement?: {
    hasToken0: boolean;
    hasToken1: boolean;
    token0Balance?: string;
    token1Balance?: string;
  };
}

/**
 * Factory contract interface
 */
export interface FactoryContract {
  address: string;
  version: 'v1' | 'v2';
}

/**
 * Event filter parameters
 */
export interface EventFilterParams {
  fromBlock?: number;
  toBlock?: number | 'latest';
  address?: string | string[];
}

