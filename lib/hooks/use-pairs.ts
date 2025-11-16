/**
 * React hook for fetching and streaming pairs
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PairInfo } from '@/types/contracts';

interface UsePairsOptions {
  includeTokenInfo?: boolean;
  blockRange?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UsePairsReturn {
  pairs: PairInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch pairs from API
 */
export function usePairs(options: UsePairsOptions = {}): UsePairsReturn {
  const {
    includeTokenInfo = false,
    blockRange = 1000,
    autoRefresh = false,
    refreshInterval = 60000,
  } = options;

  const [pairs, setPairs] = useState<PairInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPairs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        blockRange: blockRange.toString(),
        includeTokenInfo: includeTokenInfo.toString(),
      });

      const response = await fetch(`/api/pairs?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch pairs');
      }

      setPairs(data.pairs || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching pairs:', err);
    } finally {
      setLoading(false);
    }
  }, [includeTokenInfo, blockRange]);

  useEffect(() => {
    fetchPairs();
  }, [fetchPairs]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchPairs();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchPairs]);

  return {
    pairs,
    loading,
    error,
    refresh: fetchPairs,
  };
}

/**
 * Hook to stream pairs using Server-Sent Events
 */
export function usePairStream(onNewPair?: (pair: PairInfo) => void, enabled: boolean = true) {
  const [pairs, setPairs] = useState<PairInfo[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerInfo, setProviderInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    const eventSource = new EventSource('/api/pairs/stream');

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'new_pair' && data.data) {
          const newPair: PairInfo = data.data;
          setPairs((prev) => [newPair, ...prev].slice(0, 100)); // Keep last 100
          onNewPair?.(newPair);
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
      // Browsers report cancelled when navigating/reloading; avoid noisy errors
      setConnected(false);
      setError('');
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [onNewPair, enabled]);

  return {
    pairs,
    connected,
    error,
    providerInfo,
  };
}

