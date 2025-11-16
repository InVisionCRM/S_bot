/**
 * Token information fetcher
 * Retrieves ERC20 token metadata and balances
 */

import { ethers } from 'ethers';
import { ERC20_ABI } from '@/config/pulsechain';
import { PULSECHAIN_CONFIG } from '@/config/pulsechain';
import type { TokenInfo } from '@/types/contracts';
import { getServerProvider } from './provider';

/**
 * Fetch token information from contract
 */
export async function getTokenInfo(
  tokenAddress: string,
  provider?: ethers.JsonRpcProvider
): Promise<TokenInfo> {
  const prov = provider || getServerProvider();
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, prov);

  try {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      tokenContract.name().catch(() => 'Unknown'),
      tokenContract.symbol().catch(() => 'UNKNOWN'),
      tokenContract.decimals().catch(() => 18),
      tokenContract.totalSupply().catch(() => ethers.parseEther('0')),
    ]);

    return {
      address: ethers.getAddress(tokenAddress),
      name: name || 'Unknown Token',
      symbol: symbol || 'UNKNOWN',
      decimals: Number(decimals),
      totalSupply: totalSupply.toString(),
    };
  } catch (error) {
    console.error(`Error fetching token info for ${tokenAddress}:`, error);
    throw error;
  }
}

/**
 * Get token balance for a specific address
 */
export async function getTokenBalance(
  tokenAddress: string,
  holderAddress: string,
  provider?: ethers.JsonRpcProvider
): Promise<string> {
  const prov = provider || getServerProvider();
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, prov);

  try {
    const balance = await tokenContract.balanceOf(holderAddress);
    return balance.toString();
  } catch (error) {
    console.error(`Error fetching balance for ${tokenAddress}:`, error);
    return '0';
  }
}

/**
 * Check if watched address holds tokens from a pair
 */
export async function checkWatchedAddressInvolvement(
  token0Address: string,
  token1Address: string,
  provider?: ethers.JsonRpcProvider
): Promise<{
  hasToken0: boolean;
  hasToken1: boolean;
  token0Balance: string;
  token1Balance: string;
}> {
  const watchedAddress = PULSECHAIN_CONFIG.watchedAddress;
  const prov = provider || getServerProvider();

  const [token0Balance, token1Balance] = await Promise.all([
    getTokenBalance(token0Address, watchedAddress, prov),
    getTokenBalance(token1Address, watchedAddress, prov),
  ]);

  return {
    hasToken0: token0Balance !== '0',
    hasToken1: token1Balance !== '0',
    token0Balance,
    token1Balance,
  };
}

