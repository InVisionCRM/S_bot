/**
 * Wallet Service
 * Manages wallet connection and transaction signing for sniper bot
 */

import { ethers } from 'ethers';
import { createPulseChainProvider } from '@/lib/blockchain/provider';

/**
 * Wallet service for sniper bot
 * Handles private key management and transaction signing
 */
export class WalletService {
  private wallet: ethers.Wallet | null = null;
  private provider: ethers.JsonRpcProvider;

  constructor(provider?: ethers.JsonRpcProvider) {
    this.provider = provider || createPulseChainProvider();
  }

  /**
   * Initialize wallet with private key
   * IMPORTANT: Never commit private keys to git!
   */
  initializeWallet(privateKey: string): void {
    try {
      // Create wallet from private key
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      console.log('[WalletService] Wallet initialized:', this.wallet.address);
    } catch (error) {
      console.error('[WalletService] Failed to initialize wallet:', error);
      throw new Error('Invalid private key');
    }
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Get wallet instance
   */
  getWallet(): ethers.Wallet | null {
    return this.wallet;
  }

  /**
   * Check if wallet is initialized
   */
  isInitialized(): boolean {
    return this.wallet !== null;
  }

  /**
   * Get PLS balance
   */
  async getBalance(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
      this.provider
    );

    const [balance, decimals] = await Promise.all([
      tokenContract.balanceOf(this.wallet.address),
      tokenContract.decimals(),
    ]);

    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Sign and send transaction
   */
  async sendTransaction(tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    console.log('[WalletService] Sending transaction:', {
      to: tx.to,
      value: tx.value ? ethers.formatEther(tx.value) : '0',
      data: tx.data ? `${tx.data.toString().slice(0, 10)}...` : 'none',
    });

    const txResponse = await this.wallet.sendTransaction(tx);
    console.log('[WalletService] Transaction sent:', txResponse.hash);

    return txResponse;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1
  ): Promise<ethers.TransactionReceipt | null> {
    console.log(`[WalletService] Waiting for ${confirmations} confirmation(s) for tx:`, txHash);
    const receipt = await this.provider.waitForTransaction(txHash, confirmations);

    if (receipt) {
      console.log('[WalletService] Transaction confirmed:', {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed',
        gasUsed: receipt.gasUsed.toString(),
      });
    }

    return receipt;
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(tx: ethers.TransactionRequest): Promise<bigint> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    return await this.wallet.estimateGas(tx);
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice || 0n;
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.wallet = null;
    console.log('[WalletService] Wallet disconnected');
  }
}

// Singleton instance for server-side use
let walletServiceInstance: WalletService | null = null;

/**
 * Get wallet service instance
 */
export function getWalletService(): WalletService {
  if (!walletServiceInstance) {
    walletServiceInstance = new WalletService();
  }
  return walletServiceInstance;
}
