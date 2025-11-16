/**
 * API Route: Stream mint events (Server-Sent Events)
 * Provides real-time updates when tokens are minted to the watched address
 */

import { NextRequest } from 'next/server';
import { MintWatcher } from '@/lib/blockchain/mint-watcher';
import { getTokenInfo } from '@/lib/blockchain/token-info';
import type { MintEventInfo } from '@/types/mint-events';
import { getSniperEngine, getAutoSellEngine } from '@/lib/sniper/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Format token amount with decimals
 */
function formatAmount(amount: string, decimals: number): string {
  try {
    const num = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const whole = num / divisor;
    const fraction = num % divisor;
    
    if (fraction === BigInt(0)) {
      return whole.toString();
    }
    
    const fractionStr = fraction.toString().padStart(decimals, '0');
    const trimmed = fractionStr.replace(/0+$/, '');
    
    return trimmed ? `${whole}.${trimmed}` : whole.toString();
  } catch {
    return '0';
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let watcher: MintWatcher | null = null;
  let heartbeat: NodeJS.Timeout | null = null;
  let isClosed = false;

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      const sendEvent = (data: unknown) => {
        if (isClosed) {
          return; // Don't try to send if already closed
        }
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          // If controller is closed, mark as closed and stop trying
          if (error instanceof TypeError && error.message.includes('closed')) {
            isClosed = true;
          }
          // Silently ignore errors - connection is likely closed
        }
      };

      const cleanup = () => {
        if (isClosed) return; // Already cleaned up
        isClosed = true;
        
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        
        if (watcher) {
          watcher.stopListening();
          watcher = null;
        }
        
        try {
          controller.close();
        } catch (error) {
          // Ignore errors on close
        }
      };

      sendEvent({ type: 'connected', message: 'Connected to PulseChain mint event stream' });

      try {
        // Use WebSocket provider for true live events (if available)
        watcher = new MintWatcher(undefined, true);
        
        // Log provider type
        const providerType = watcher.isLive ? 'WebSocket (LIVE)' : 'HTTP (Polling)';
        sendEvent({ type: 'info', message: `Using ${providerType} provider for mint events` });
        
        // Start listening for new mint events (skip historical events for cleaner stream)
        await watcher.startListening(async (mintEvent) => {
          if (isClosed) return; // Don't process if closed

          try {
            // 🎯 SNIPER BOT INTEGRATION
            // Trigger sniper if running and auto-buy enabled
            const sniper = getSniperEngine();
            if (sniper.running && sniper.getConfig().autoBuyEnabled) {
              // Execute snipe in background (non-blocking)
              sniper.handleMintEvent(mintEvent).catch((error) => {
                console.error('[MintStream] Sniper error:', error);
              });

              // If auto-sell is enabled, create limit orders for new positions
              const autoSell = getAutoSellEngine();
              if (autoSell.running) {
                // Add token to price monitoring
                setTimeout(() => {
                  try {
                    const position = sniper.getPosition(mintEvent.token);
                    if (position) {
                      autoSell.createAutoLimitOrders(position);
                    }
                  } catch (error) {
                    console.error('[MintStream] Auto-sell setup error:', error);
                  }
                }, 5000); // Wait 5s for position to be created
              }
            }

            // Enrich with token info
            const tokenInfo = await getTokenInfo(mintEvent.token).catch(() => null);

            const enrichedMint: MintEventInfo = {
              ...mintEvent,
              tokenInfo: tokenInfo || {
                address: mintEvent.token,
                name: 'Unknown',
                symbol: 'UNKNOWN',
                decimals: 18,
              },
              formattedAmount: tokenInfo
                ? formatAmount(mintEvent.amount, tokenInfo.decimals)
                : formatAmount(mintEvent.amount, 18),
              isWatchedAddress: true,
            };

            sendEvent({ type: 'new_mint', data: enrichedMint });
          } catch (error) {
            if (!isClosed) {
              console.error('Error enriching mint event:', error);
              sendEvent({
                type: 'mint_event',
                data: {
                  ...mintEvent,
                  tokenInfo: {
                    address: mintEvent.token,
                    name: 'Unknown',
                    symbol: 'UNKNOWN',
                    decimals: 18,
                  },
                  formattedAmount: formatAmount(mintEvent.amount, 18),
                  isWatchedAddress: true,
                },
              });
            }
          }
        }, undefined, false); // Don't include historical events in stream

        // Keep connection alive with heartbeat
        heartbeat = setInterval(() => {
          if (!isClosed) {
            sendEvent({ type: 'heartbeat', timestamp: Date.now() });
          }
        }, 30000); // Every 30 seconds

        // Cleanup on client disconnect
        if (request.signal) {
          request.signal.addEventListener('abort', cleanup);
        }
      } catch (error) {
        if (!isClosed) {
          sendEvent({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        cleanup();
      }
    },
    cancel() {
      // Cleanup when stream is cancelled
      isClosed = true;
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
      if (watcher) {
        watcher.stopListening();
        watcher = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for nginx
    },
  });
}

