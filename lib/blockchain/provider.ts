/**
 * PulseChain blockchain provider setup
 * Manages connection to PulseChain network
 */

import { ethers } from 'ethers';
import { PULSECHAIN_CONFIG } from '@/config/pulsechain';

/**
 * Creates a JsonRpcProvider for PulseChain
 * Uses primary RPC with fallback capability
 */
export function createPulseChainProvider(): ethers.JsonRpcProvider {
  const rpcUrl = PULSECHAIN_CONFIG.rpcUrls.primary;
  
  if (!rpcUrl) {
    throw new Error('PulseChain RPC URL is not configured. Set NEXT_PUBLIC_PULSECHAIN_RPC_URL environment variable.');
  }
  
  return new ethers.JsonRpcProvider(rpcUrl, {
    chainId: PULSECHAIN_CONFIG.chainId,
    name: 'pulsechain',
  });
}

/**
 * Creates a provider with WebSocket support for real-time events
 * Falls back to HTTP if WebSocket is not available
 */
export function createPulseChainProviderWithWebSocket(): ethers.JsonRpcProvider | ethers.WebSocketProvider {
  // Try WebSocket if available
  const wsUrl = process.env.NEXT_PUBLIC_PULSECHAIN_WS_URL;

  if (wsUrl) {
    try {
      console.log('[Provider] Attempting to create WebSocket provider:', wsUrl);
      const wsProvider = new ethers.WebSocketProvider(wsUrl, PULSECHAIN_CONFIG.chainId);

      // Add error handler for WebSocket connection errors
      // Access the internal WebSocket to add error listener
      const websocket = (wsProvider as any)._websocket;
      if (websocket) {
        websocket.on('error', (error: Error) => {
          console.error('[Provider] WebSocket connection error:', error.message);
          console.warn('[Provider] WebSocket failed - consider disabling NEXT_PUBLIC_PULSECHAIN_WS_URL or using HTTP-only mode');
        });

        websocket.on('close', (code: number, reason: string) => {
          if (code !== 1000) { // 1000 = normal closure
            console.warn(`[Provider] WebSocket closed unexpectedly: ${code} - ${reason}`);
          }
        });
      }

      console.log('[Provider] ✅ WebSocket provider created successfully');
      return wsProvider;
    } catch (error) {
      console.warn('[Provider] WebSocket provider creation failed, falling back to HTTP:', error);
    }
  }

  console.log('[Provider] Using HTTP provider (WebSocket not configured or unavailable)');
  return createPulseChainProvider();
}

/**
 * Singleton provider instance (server-side only)
 * DO NOT use this on the client side
 */
let serverProvider: ethers.JsonRpcProvider | null = null;

export function getServerProvider(): ethers.JsonRpcProvider {
  if (!serverProvider) {
    serverProvider = createPulseChainProvider();
  }
  return serverProvider;
}

