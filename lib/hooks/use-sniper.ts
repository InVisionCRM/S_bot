/**
 * Sniper Bot React Hook
 * Client-side hook for managing sniper bot state
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SniperConfig, TokenPosition, SnipeResult, LimitOrder } from '@/types/sniper';
import { DEFAULT_SNIPER_CONFIG, SNIPER_STORAGE_KEY } from '@/config/sniper';

/**
 * Hook for managing sniper bot configuration and state
 */
export function useSniper() {
  const [config, setConfig] = useState<SniperConfig>(DEFAULT_SNIPER_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SNIPER_STORAGE_KEY);
    if (stored) {
      try {
        const parsedConfig = JSON.parse(stored);
        setConfig({ ...DEFAULT_SNIPER_CONFIG, ...parsedConfig });
      } catch (error) {
        console.error('Failed to load sniper config:', error);
      }
    }
  }, []);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(SNIPER_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  /**
   * Initialize sniper with private key
   */
  const initialize = useCallback(async (privateKey: string) => {
    try {
      const response = await fetch('/api/sniper/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize sniper');
      }

      const data = await response.json();
      setWalletAddress(data.address);
      setBalance(data.balance);
      setIsInitialized(true);

      return data;
    } catch (error) {
      console.error('Sniper initialization failed:', error);
      throw error;
    }
  }, []);

  /**
   * Start sniper bot
   */
  const start = useCallback(async () => {
    try {
      const response = await fetch('/api/sniper/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error('Failed to start sniper');
      }

      setIsRunning(true);
      return await response.json();
    } catch (error) {
      console.error('Failed to start sniper:', error);
      throw error;
    }
  }, [config]);

  /**
   * Stop sniper bot
   */
  const stop = useCallback(async () => {
    try {
      const response = await fetch('/api/sniper/stop', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to stop sniper');
      }

      setIsRunning(false);
      return await response.json();
    } catch (error) {
      console.error('Failed to stop sniper:', error);
      throw error;
    }
  }, []);

  /**
   * Update sniper configuration
   */
  const updateConfig = useCallback((updates: Partial<SniperConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Get sniper status
   */
  const getStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/sniper/status');
      if (!response.ok) {
        throw new Error('Failed to get status');
      }

      const data = await response.json();
      setIsRunning(data.isRunning);
      setIsInitialized(data.isInitialized);
      setWalletAddress(data.walletAddress);
      setBalance(data.balance);

      return data;
    } catch (error) {
      console.error('Failed to get sniper status:', error);
      throw error;
    }
  }, []);

  /**
   * Refresh wallet balance
   */
  const refreshBalance = useCallback(async () => {
    try {
      const response = await fetch('/api/sniper/balance');
      if (!response.ok) {
        throw new Error('Failed to get balance');
      }

      const data = await response.json();
      setBalance(data.balance);

      return data.balance;
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      throw error;
    }
  }, []);

  return {
    config,
    isRunning,
    walletAddress,
    balance,
    isInitialized,
    initialize,
    start,
    stop,
    updateConfig,
    getStatus,
    refreshBalance,
  };
}

/**
 * Hook for managing portfolio positions
 */
export function usePortfolio() {
  const [positions, setPositions] = useState<TokenPosition[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch all positions
   */
  const fetchPositions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sniper/portfolio');
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio');
      }

      const data = await response.json();
      setPositions(data.positions);

      return data.positions;
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sell position
   */
  const sellPosition = useCallback(async (tokenAddress: string, amount?: string) => {
    try {
      const response = await fetch(`/api/sniper/sell/${tokenAddress}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        throw new Error('Failed to sell position');
      }

      const data = await response.json();

      // Refresh positions
      await fetchPositions();

      return data;
    } catch (error) {
      console.error('Failed to sell position:', error);
      throw error;
    }
  }, [fetchPositions]);

  // Fetch positions on mount
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return {
    positions,
    loading,
    fetchPositions,
    sellPosition,
  };
}

/**
 * Hook for managing limit orders
 */
export function useLimitOrders() {
  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch all limit orders
   */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sniper/limit-orders');
      if (!response.ok) {
        throw new Error('Failed to fetch limit orders');
      }

      const data = await response.json();
      setOrders(data.orders);

      return data.orders;
    } catch (error) {
      console.error('Failed to fetch limit orders:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create limit order
   */
  const createOrder = useCallback(async (
    tokenAddress: string,
    orderType: 'take_profit' | 'stop_loss',
    targetPricePLS: string,
    amountTokens?: string
  ) => {
    try {
      const response = await fetch('/api/sniper/limit-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress, orderType, targetPricePLS, amountTokens }),
      });

      if (!response.ok) {
        throw new Error('Failed to create limit order');
      }

      const data = await response.json();

      // Refresh orders
      await fetchOrders();

      return data.order;
    } catch (error) {
      console.error('Failed to create limit order:', error);
      throw error;
    }
  }, [fetchOrders]);

  /**
   * Cancel limit order
   */
  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      const response = await fetch(`/api/sniper/limit-orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel limit order');
      }

      // Refresh orders
      await fetchOrders();

      return await response.json();
    } catch (error) {
      console.error('Failed to cancel limit order:', error);
      throw error;
    }
  }, [fetchOrders]);

  // Fetch orders on mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    fetchOrders,
    createOrder,
    cancelOrder,
  };
}
