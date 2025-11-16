/**
 * Swap Service
 * Handles token swaps via PulseX router
 */

import { ethers } from 'ethers';
import { PULSEX_CONFIG, PULSEX_ROUTER_ABI } from '@/config/sniper';
import { ERC20_ABI } from '@/config/pulsechain';
import type { WalletService } from './wallet-service';

/**
 * Swap service for buying/selling tokens on PulseX
 */
export class SwapService {
  private routerContract: ethers.Contract;
  private walletService: WalletService;

  constructor(walletService: WalletService, routerAddress?: string) {
    this.walletService = walletService;

    const wallet = walletService.getWallet();
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    // Create router contract instance
    this.routerContract = new ethers.Contract(
      routerAddress || PULSEX_CONFIG.routerV2,
      PULSEX_ROUTER_ABI,
      wallet
    );
  }

  /**
   * Buy tokens with PLS
   */
  async buyTokenWithPLS(
    tokenAddress: string,
    plsAmount: string,
    slippagePercent: number,
    gasLimitMultiplier: number = 1.2,
    customGasPriceGwei?: string
  ): Promise<ethers.TransactionResponse> {
    const wallet = this.walletService.getWallet();
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    console.log('[SwapService] Buying token:', {
      token: tokenAddress,
      plsAmount,
      slippage: `${slippagePercent}%`,
    });

    // Convert PLS amount to wei
    const amountIn = ethers.parseEther(plsAmount);

    // Build swap path: WPLS -> Token
    const path = [PULSEX_CONFIG.WPLS, tokenAddress];

    // Get expected output amount
    const amounts = await this.routerContract.getAmountsOut(amountIn, path);
    const amountOutMin = amounts[1];

    // Calculate minimum output with slippage
    const slippageBigInt = BigInt(Math.floor(slippagePercent * 100)); // Convert to basis points
    const minAmountOut = (amountOutMin * (BigInt(10000) - slippageBigInt)) / BigInt(10000);

    console.log('[SwapService] Expected output:', {
      expectedTokens: ethers.formatUnits(amountOutMin, 18),
      minTokensAfterSlippage: ethers.formatUnits(minAmountOut, 18),
    });

    // Set deadline (5 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + PULSEX_CONFIG.deadlineBuffer;

    // Estimate gas
    const estimatedGas = await this.routerContract.swapExactETHForTokens.estimateGas(
      minAmountOut,
      path,
      wallet.address,
      deadline,
      { value: amountIn }
    );

    const gasLimit = BigInt(Math.floor(Number(estimatedGas) * gasLimitMultiplier));

    console.log('[SwapService] Gas estimate:', {
      estimated: estimatedGas.toString(),
      limit: gasLimit.toString(),
    });

    // Build transaction
    const tx: ethers.TransactionRequest = {
      to: await this.routerContract.getAddress(),
      data: this.routerContract.interface.encodeFunctionData('swapExactETHForTokens', [
        minAmountOut,
        path,
        wallet.address,
        deadline,
      ]),
      value: amountIn,
      gasLimit,
    };

    // Add custom gas price if specified
    if (customGasPriceGwei) {
      tx.gasPrice = ethers.parseUnits(customGasPriceGwei, 'gwei');
    }

    // Execute swap
    return await this.walletService.sendTransaction(tx);
  }

  /**
   * Sell tokens for PLS
   */
  async sellTokenForPLS(
    tokenAddress: string,
    tokenAmount: string,
    slippagePercent: number,
    gasLimitMultiplier: number = 1.2,
    customGasPriceGwei?: string
  ): Promise<ethers.TransactionResponse> {
    const wallet = this.walletService.getWallet();
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    console.log('[SwapService] Selling token:', {
      token: tokenAddress,
      amount: tokenAmount,
      slippage: `${slippagePercent}%`,
    });

    // Get token decimals
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const decimals = await tokenContract.decimals();

    // Convert token amount
    const amountIn = ethers.parseUnits(tokenAmount, decimals);

    // Build swap path: Token -> WPLS
    const path = [tokenAddress, PULSEX_CONFIG.WPLS];

    // Get expected output amount
    const amounts = await this.routerContract.getAmountsOut(amountIn, path);
    const amountOutMin = amounts[1];

    // Calculate minimum output with slippage
    const slippageBigInt = BigInt(Math.floor(slippagePercent * 100));
    const minAmountOut = (amountOutMin * (BigInt(10000) - slippageBigInt)) / BigInt(10000);

    console.log('[SwapService] Expected output:', {
      expectedPLS: ethers.formatEther(amountOutMin),
      minPLSAfterSlippage: ethers.formatEther(minAmountOut),
    });

    // Check and approve token spending if needed
    await this.approveTokenIfNeeded(tokenAddress, amountIn);

    // Set deadline
    const deadline = Math.floor(Date.now() / 1000) + PULSEX_CONFIG.deadlineBuffer;

    // Estimate gas
    const estimatedGas = await this.routerContract.swapExactTokensForETH.estimateGas(
      amountIn,
      minAmountOut,
      path,
      wallet.address,
      deadline
    );

    const gasLimit = BigInt(Math.floor(Number(estimatedGas) * gasLimitMultiplier));

    // Build transaction
    const tx: ethers.TransactionRequest = {
      to: await this.routerContract.getAddress(),
      data: this.routerContract.interface.encodeFunctionData('swapExactTokensForETH', [
        amountIn,
        minAmountOut,
        path,
        wallet.address,
        deadline,
      ]),
      gasLimit,
    };

    // Add custom gas price if specified
    if (customGasPriceGwei) {
      tx.gasPrice = ethers.parseUnits(customGasPriceGwei, 'gwei');
    }

    // Execute swap
    return await this.walletService.sendTransaction(tx);
  }

  /**
   * Get token price in PLS
   */
  async getTokenPricePLS(tokenAddress: string, tokenAmount: string = '1'): Promise<string> {
    // Get token decimals
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function decimals() view returns (uint8)'],
      this.walletService.getWallet()!
    );

    const decimals = await tokenContract.decimals();
    const amountIn = ethers.parseUnits(tokenAmount, decimals);

    // Build path: Token -> WPLS
    const path = [tokenAddress, PULSEX_CONFIG.WPLS];

    try {
      const amounts = await this.routerContract.getAmountsOut(amountIn, path);
      return ethers.formatEther(amounts[1]);
    } catch (error) {
      console.error('[SwapService] Error getting price:', error);
      return '0';
    }
  }

  /**
   * Approve token spending if needed
   */
  private async approveTokenIfNeeded(tokenAddress: string, amount: bigint): Promise<void> {
    const wallet = this.walletService.getWallet();
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const routerAddress = await this.routerContract.getAddress();

    // Check current allowance
    const allowance = await tokenContract.allowance(wallet.address, routerAddress);

    if (allowance < amount) {
      console.log('[SwapService] Approving token spending...');

      // Approve max uint256 for convenience (one-time approval)
      const approveTx = await tokenContract.approve(routerAddress, ethers.MaxUint256);
      await approveTx.wait();

      console.log('[SwapService] Token approved:', approveTx.hash);
    }
  }
}
