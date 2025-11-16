/**
 * Portfolio Service
 * Manages token positions and persists portfolio data
 */

import type { TokenPosition } from '@/types/sniper';
import { PORTFOLIO_STORAGE_KEY } from '@/config/sniper';

/**
 * Portfolio service for tracking token positions
 */
export class PortfolioService {
  private positions: Map<string, TokenPosition> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Add or update position
   */
  addPosition(position: TokenPosition): void {
    this.positions.set(position.tokenAddress.toLowerCase(), position);
    this.saveToStorage();
  }

  /**
   * Update position
   */
  updatePosition(tokenAddress: string, updates: Partial<TokenPosition>): void {
    const position = this.positions.get(tokenAddress.toLowerCase());
    if (position) {
      const updated = { ...position, ...updates };
      this.positions.set(tokenAddress.toLowerCase(), updated);
      this.saveToStorage();
    }
  }

  /**
   * Get position
   */
  getPosition(tokenAddress: string): TokenPosition | undefined {
    return this.positions.get(tokenAddress.toLowerCase());
  }

  /**
   * Get all positions
   */
  getAllPositions(): TokenPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get holding positions (not sold)
   */
  getHoldingPositions(): TokenPosition[] {
    return this.getAllPositions().filter((p) => p.status === 'holding');
  }

  /**
   * Get sold positions
   */
  getSoldPositions(): TokenPosition[] {
    return this.getAllPositions().filter((p) => p.status === 'sold');
  }

  /**
   * Remove position
   */
  removePosition(tokenAddress: string): void {
    this.positions.delete(tokenAddress.toLowerCase());
    this.saveToStorage();
  }

  /**
   * Clear all positions
   */
  clearAll(): void {
    this.positions.clear();
    this.saveToStorage();
  }

  /**
   * Calculate total portfolio stats
   */
  getPortfolioStats(): {
    totalPositions: number;
    holdingPositions: number;
    soldPositions: number;
    totalInvested: number;
    totalRealized: number;
  } {
    const positions = this.getAllPositions();
    const holding = this.getHoldingPositions();
    const sold = this.getSoldPositions();

    const totalInvested = positions.reduce((sum, p) => sum + parseFloat(p.buyPricePLS || '0'), 0);
    const totalRealized = sold.reduce((sum, p) => sum + parseFloat(p.sellPricePLS || '0'), 0);

    return {
      totalPositions: positions.length,
      holdingPositions: holding.length,
      soldPositions: sold.length,
      totalInvested,
      totalRealized,
    };
  }

  /**
   * Load positions from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
      if (stored) {
        const positions = JSON.parse(stored) as TokenPosition[];
        this.positions = new Map(
          positions.map((p) => [p.tokenAddress.toLowerCase(), p])
        );
        console.log('[PortfolioService] Loaded', this.positions.size, 'positions from storage');
      }
    } catch (error) {
      console.error('[PortfolioService] Error loading from storage:', error);
    }
  }

  /**
   * Save positions to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const positions = this.getAllPositions();
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(positions));
    } catch (error) {
      console.error('[PortfolioService] Error saving to storage:', error);
    }
  }

  /**
   * Export portfolio to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.getAllPositions(), null, 2);
  }

  /**
   * Import portfolio from JSON
   */
  importFromJSON(json: string): void {
    try {
      const positions = JSON.parse(json) as TokenPosition[];
      this.positions = new Map(
        positions.map((p) => [p.tokenAddress.toLowerCase(), p])
      );
      this.saveToStorage();
      console.log('[PortfolioService] Imported', this.positions.size, 'positions');
    } catch (error) {
      console.error('[PortfolioService] Error importing from JSON:', error);
      throw new Error('Invalid JSON format');
    }
  }
}

// Singleton instance for client-side use
let portfolioServiceInstance: PortfolioService | null = null;

/**
 * Get portfolio service instance
 */
export function getPortfolioService(): PortfolioService {
  if (typeof window === 'undefined') {
    throw new Error('PortfolioService can only be used on client side');
  }

  if (!portfolioServiceInstance) {
    portfolioServiceInstance = new PortfolioService();
  }

  return portfolioServiceInstance;
}
