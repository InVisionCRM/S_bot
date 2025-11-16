/**
 * React hook for fetching and streaming mint events
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MintEventInfo } from '@/types/mint-events';

interface UseMintsOptions {
  includeTokenInfo?: boolean;
  blockRange?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseMintsReturn {
  mints: MintEventInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch mint events from API
 */
export function useMints(options: UseMintsOptions = {}): UseMintsReturn {
  const {
    includeTokenInfo = false,
    blockRange = 1000,
    autoRefresh = false,
    refreshInterval = 15000,
  } = options;

  const [mints, setMints] = useState<MintEventInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        blockRange: blockRange.toString(),
        includeTokenInfo: includeTokenInfo.toString(),
      });

      const response = await fetch(`/api/mints?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch mint events');
      }

      setMints(data.mints || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching mint events:', err);
    } finally {
      setLoading(false);
    }
  }, [includeTokenInfo, blockRange]);

  useEffect(() => {
    fetchMints();
  }, [fetchMints]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMints();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMints]);

  return {
    mints,
    loading,
    error,
    refresh: fetchMints,
  };
}

/**
 * Hook to stream mint events using Server-Sent Events
 */
export function useMintStream(onNewMint?: (mint: MintEventInfo) => void, enabled: boolean = true) {
  const [mints, setMints] = useState<MintEventInfo[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerInfo, setProviderInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    const eventSource = new EventSource('/api/mints/stream');

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'new_mint' && data.data) {
          const newMint: MintEventInfo = data.data;
          setMints((prev) => [newMint, ...prev].slice(0, 100)); // Keep last 100
          onNewMint?.(newMint);
        } else if (data.type === 'heartbeat') {
          // Connection alive
        } else if (data.type === 'info') {
          setProviderInfo(data.message);
        } else if (data.type === 'error') {
          setError(data.message);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      // Avoid noisy console in dev; EventSource will reconnect automatically
      setConnected(false);
      setError('');
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [onNewMint, enabled]);

  return {
    mints,
    connected,
    error,
    providerInfo,
  };
}

