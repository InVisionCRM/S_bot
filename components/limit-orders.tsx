/**
 * Limit Orders Component
 * Manage limit orders for auto-sell
 */

'use client';

import { useState } from 'react';
import type { LimitOrder } from '@/types/sniper';

interface LimitOrdersProps {
  orders: LimitOrder[];
  onCancel: (orderId: string) => Promise<void>;
  onCreate?: (tokenAddress: string, orderType: 'take_profit' | 'stop_loss', targetPrice: string) => Promise<void>;
}

export function LimitOrders({ orders, onCancel, onCreate }: LimitOrdersProps) {
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);

  const handleCancel = async (orderId: string) => {
    if (!confirm('Cancel this limit order?')) {
      return;
    }

    setCancelLoading(orderId);
    try {
      await onCancel(orderId);
    } catch (error) {
      console.error('Failed to cancel order:', error);
      alert('Failed to cancel order. Check console for details.');
    } finally {
      setCancelLoading(null);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const executedOrders = orders.filter((o) => o.status === 'executed');

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getOrderTypeColor = (orderType: 'take_profit' | 'stop_loss') => {
    return orderType === 'take_profit'
      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
  };

  const getOrderTypeLabel = (orderType: 'take_profit' | 'stop_loss') => {
    return orderType === 'take_profit' ? '🎯 Take Profit' : '🛑 Stop Loss';
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            📋 Limit Orders
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {orders.length} total orders ({pendingOrders.length} pending, {executedOrders.length} executed)
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No limit orders. Enable auto-sell in settings or create manual orders.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Orders */}
          {pendingOrders.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Pending ({pendingOrders.length})
              </h3>
              <div className="space-y-3">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${getOrderTypeColor(order.orderType)}`}>
                            {getOrderTypeLabel(order.orderType)}
                          </span>
                          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                            Pending
                          </span>
                        </div>

                        <div className="mt-3 space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Token:</span>
                            <span className="ml-2 font-mono text-xs text-gray-900 dark:text-gray-100">
                              {order.tokenAddress.slice(0, 10)}...{order.tokenAddress.slice(-8)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Target Price:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {order.targetPricePLS} PLS
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {parseFloat(order.amountTokens).toLocaleString()} tokens
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Slippage:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {order.slippagePercent}%
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Created: {formatTime(order.createdAt)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={cancelLoading === order.id}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-4"
                      >
                        {cancelLoading === order.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Executed Orders */}
          {executedOrders.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Executed ({executedOrders.length})
              </h3>
              <div className="space-y-3">
                {executedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 opacity-75"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${getOrderTypeColor(order.orderType)}`}>
                            {getOrderTypeLabel(order.orderType)}
                          </span>
                          <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            Executed
                          </span>
                        </div>

                        <div className="mt-3 space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Target Price:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {order.targetPricePLS} PLS
                            </span>
                          </div>
                          {order.transactionHash && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Tx:</span>
                              <a
                                href={`https://scan.pulsechain.com/tx/${order.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {order.transactionHash.slice(0, 10)}...{order.transactionHash.slice(-8)} →
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Executed: {order.executedAt ? formatTime(order.executedAt) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
