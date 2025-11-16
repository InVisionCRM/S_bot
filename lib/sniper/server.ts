/**
 * Server-Side Sniper Singleton
 * Manages a single sniper engine instance for the server
 */

import { SniperEngine } from './sniper-engine';
import { PriceMonitor } from './price-monitor';
import { AutoSellEngine } from './auto-sell-engine';
import { PortfolioService } from './portfolio-service';
import { DEFAULT_SNIPER_CONFIG } from '@/config/sniper';
import type { SniperConfig } from '@/types/sniper';

let sniperInstance: SniperEngine | null = null;
let priceMonitorInstance: PriceMonitor | null = null;
let autoSellInstance: AutoSellEngine | null = null;

/**
 * Get or create sniper engine singleton
 */
export function getSniperEngine(): SniperEngine {
  if (!sniperInstance) {
    // Load config from environment or use defaults
    const config: SniperConfig = {
      ...DEFAULT_SNIPER_CONFIG,
      // You could override with env vars here if needed
    };

    sniperInstance = new SniperEngine(config);

    // Auto-initialize with private key from environment
    const privateKey = process.env.SNIPER_PRIVATE_KEY;
    if (privateKey) {
      try {
        sniperInstance.initialize(privateKey);
        console.log('[SniperServer] Initialized with wallet:', sniperInstance.getWalletAddress());
      } catch (error) {
        console.error('[SniperServer] Failed to initialize wallet:', error);
      }
    } else {
      console.warn('[SniperServer] No SNIPER_PRIVATE_KEY found in environment');
    }

    // Set up callbacks for logging
    sniperInstance.onSnipe((result) => {
      if (result.success) {
        console.log('[SniperServer] ✅ Snipe successful:', {
          token: result.tokenAddress,
          tx: result.transactionHash,
          spent: result.amountSpentPLS,
          received: result.amountReceived,
        });
      } else {
        console.error('[SniperServer] ❌ Snipe failed:', {
          token: result.tokenAddress,
          error: result.error,
        });
      }
    });
  } else {
    // If instance exists but not initialized, try to initialize from env now
    if (!sniperInstance.initialized) {
      const privateKey = process.env.SNIPER_PRIVATE_KEY;
      if (privateKey) {
        try {
          sniperInstance.initialize(privateKey);
          console.log('[SniperServer] Initialized (late) with wallet:', sniperInstance.getWalletAddress());
        } catch (error) {
          console.error('[SniperServer] Late initialization failed:', error);
        }
      }
    }
  }

  return sniperInstance;
}

/**
 * Get or create price monitor singleton
 */
export function getPriceMonitor(): PriceMonitor {
  if (!priceMonitorInstance) {
    priceMonitorInstance = new PriceMonitor();
  }

  return priceMonitorInstance;
}

/**
 * Get or create auto-sell engine singleton
 */
export function getAutoSellEngine(): AutoSellEngine {
  if (!autoSellInstance) {
    const sniper = getSniperEngine();
    const priceMonitor = getPriceMonitor();

    // Note: PortfolioService is client-side only, so we create a simple in-memory version
    // The actual portfolio is managed client-side via localStorage
    const portfolioService = new PortfolioService();

    autoSellInstance = new AutoSellEngine(sniper, priceMonitor, portfolioService);

    // Set up callback for auto-sell notifications
    autoSellInstance.onSell((position, order) => {
      console.log('[AutoSellEngine] ✅ Auto-sell executed:', {
        token: position.tokenSymbol,
        orderType: order.orderType,
        targetPrice: order.targetPricePLS,
        txHash: position.sellTransactionHash,
      });
    });
  }

  return autoSellInstance;
}

/**
 * Update sniper configuration
 */
export function updateSniperConfig(config: Partial<SniperConfig>): void {
  const sniper = getSniperEngine();
  sniper.updateConfig(config);
  console.log('[SniperServer] Config updated:', config);
}

/**
 * Get current sniper status
 */
export function getSniperStatus() {
  const sniper = getSniperEngine();

  return {
    isRunning: sniper.running,
    isInitialized: sniper.initialized,
    walletAddress: sniper.getWalletAddress(),
    config: sniper.getConfig(),
  };
}

/**
 * Clean up (for server shutdown)
 */
export function shutdownSniper(): void {
  if (sniperInstance) {
    sniperInstance.stop();
    console.log('[SniperServer] Sniper shut down');
  }

  if (priceMonitorInstance) {
    priceMonitorInstance.stop();
    console.log('[SniperServer] Price monitor shut down');
  }

  if (autoSellInstance) {
    autoSellInstance.stop();
    console.log('[SniperServer] Auto-sell engine shut down');
  }
}
