/**
 * API Route: Stream pairs (Server-Sent Events)
 * Provides real-time updates when new pairs are created
 */

import { NextRequest } from 'next/server';
import { FactoryWatcher } from '@/lib/blockchain/factory-watcher';
import { getTokenInfo, checkWatchedAddressInvolvement } from '@/lib/blockchain/token-info';
import type { PairInfo } from '@/types/contracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let watcher: FactoryWatcher | null = null;
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

      sendEvent({ type: 'connected', message: 'Connected to PulseChain pair stream' });

      try {
        // Use WebSocket provider for true live events (if available)
        watcher = new FactoryWatcher(undefined, true);
        
        // Log provider type
        const providerType = watcher.isLive ? 'WebSocket (LIVE)' : 'HTTP (Polling)';
        sendEvent({ type: 'info', message: `Using ${providerType} provider` });
        
        // Start listening for new pairs (skip historical events for cleaner stream - only show NEW ones)
        await watcher.startListening(async (pairEvent) => {
          if (isClosed) return; // Don't process if closed
          
          try {
            // Enrich with token info
            const [token0Info, token1Info, involvement] = await Promise.all([
              getTokenInfo(pairEvent.token0).catch(() => null),
              getTokenInfo(pairEvent.token1).catch(() => null),
              checkWatchedAddressInvolvement(pairEvent.token0, pairEvent.token1).catch(() => null),
            ]);

            const enrichedPair: PairInfo = {
              ...pairEvent,
              token0Info: token0Info || {
                address: pairEvent.token0,
                name: 'Unknown',
                symbol: 'UNKNOWN',
                decimals: 18,
                totalSupply: '0',
              },
              token1Info: token1Info || {
                address: pairEvent.token1,
                name: 'Unknown',
                symbol: 'UNKNOWN',
                decimals: 18,
                totalSupply: '0',
              },
              watchedAddressInvolvement: involvement || undefined,
            };

            sendEvent({ type: 'new_pair', data: enrichedPair });
          } catch (error) {
            if (!isClosed) {
              console.error('Error enriching pair event:', error);
              sendEvent({ type: 'pair_event', data: pairEvent });
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
