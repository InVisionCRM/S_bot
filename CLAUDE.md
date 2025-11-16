# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **PulseChain Token Sniper Bot & Watcher Dashboard** - a real-time monitoring application for tracking newly created token pairs on PulseChain's PulseX V1 and V2 DEX factories, as well as monitoring token mint events (transfers from the zero address).

**Tech Stack:**
- Next.js 16 (App Router)
- TypeScript (strict mode)
- Ethers.js v6 for blockchain interaction
- Tailwind CSS v4
- Server-Sent Events (SSE) for real-time streaming

## Common Commands

```bash
# Development
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm start            # Run production build
npm run lint         # Run ESLint
```

## Environment Variables

Required configuration in `.env.local`:
- `NEXT_PUBLIC_PULSECHAIN_RPC_URL` - HTTP RPC endpoint (default: https://rpc.pulsechain.com)
- `NEXT_PUBLIC_PULSECHAIN_WS_URL` - (Optional) WebSocket RPC endpoint for real-time events
  - **IMPORTANT**: Most public RPCs don't support WebSocket or the `eth_newFilter` method
  - Leave this commented out to use HTTP polling (recommended for public RPCs)
  - Only use if you have a paid RPC service or your own PulseChain node

## Architecture Overview

### Dual Monitoring System

The app has two main monitoring modes:

1. **Pairs Monitoring** - Tracks `PairCreated` events from PulseX V1 & V2 factory contracts
2. **Mints Monitoring** - Tracks `Transfer` events from zero address (0x000...000) to the watched address

Both support **dual data fetching modes**:
- **Polling Mode**: HTTP-based, fetches data at intervals (default: 15s)
- **Streaming Mode**: Server-Sent Events (SSE) for real-time updates

### Sniper Bot System (NEW)

Automated trading system for Pump.tires token launches:

**Detection**: Monitors mint events to Pump.tires contract (`0x6538A83a81d855B965983161AF6a83e616D16fD5`)

**Execution Flow**:
1. Mint event detected → triggers `SniperEngine.handleMintEvent()`
2. Checks if auto-buy enabled
3. Executes PulseX swap via `SwapService.buyTokenWithPLS()`
4. Creates portfolio position
5. (Optional) Creates limit orders for auto-sell

**Key Components**:
- `SniperEngine` - Main bot logic, coordinates all operations
- `WalletService` - Private key management, transaction signing
- `SwapService` - PulseX router interactions (buy/sell)
- `PortfolioService` - Client-side position tracking (localStorage)
- `PriceMonitor` - Monitors prices every 10s for limit orders
- `AutoSellEngine` - Executes limit orders when price targets hit

### Key Components

**Blockchain Watchers** (`lib/blockchain/`):
- `factory-watcher.ts` - Monitors PulseX factories for new pair creation events
- `mint-watcher.ts` - Monitors network-wide Transfer events from zero address
- `provider.ts` - Manages Ethers.js provider instances (HTTP & WebSocket)
- `token-info.ts` - Fetches ERC20 token metadata (name, symbol, decimals, balances)

**API Routes** (`app/api/`):
- `pairs/route.ts` - REST endpoint for fetching recent pairs
- `pairs/stream/route.ts` - SSE endpoint for real-time pair events
- `mints/route.ts` - REST endpoint for fetching recent mint events
- `mints/stream/route.ts` - SSE endpoint for real-time mint events

**React Hooks** (`lib/hooks/`):
- `use-pairs.ts` - Provides `usePairs()` for polling and `usePairStream()` for SSE
- `use-mints.ts` - Provides `useMints()` for polling and `useMintStream()` for SSE

### Configuration

All PulseChain-specific constants are in `config/pulsechain.ts`:
- Factory contract addresses (V1 & V2)
- Watched address for tracking holdings
- Chain ID (369 for PulseChain mainnet)
- ABIs for Factory and ERC20 contracts

**Important**: When modifying monitored addresses or factories, update `config/pulsechain.ts`.

### Live Event Streaming Architecture

The streaming system uses a **Server-Sent Events (SSE)** pattern:

1. Server routes (`app/api/*/stream/route.ts`) create watcher instances
2. Watchers use Ethers.js `contract.on()` for live event listeners
3. WebSocket provider enables true real-time events; HTTP provider polls (~4s intervals)
4. Events are sent to client via SSE connection
5. Client hooks maintain connection and update state reactively

**Critical**: SSE streams must be properly cleaned up. All stream routes implement cleanup on connection close using `request.signal.addEventListener('abort', ...)` to call `watcher.stopListening()`.

### Type System

**Core Types** (`types/`):
- `contracts.ts` - `PairCreatedEvent`, `PairInfo`, `TokenInfo`
- `mint-events.ts` - `MintEvent`, `MintEventInfo`

All blockchain addresses are checksummed using `ethers.getAddress()`.

## Development Notes

### Server vs Client Components
- All API routes are server-side only (use `getServerProvider()`)
- Main dashboard (`app/page.tsx`) is a client component (`'use client'`)
- Hooks are client-side only
- Provider singletons are server-side only

### Adding New Watchers
When creating new blockchain event watchers:
1. Extend the watcher pattern from `factory-watcher.ts` or `mint-watcher.ts`
2. Support both historical events (`includeHistorical`) and live listening
3. Implement proper cleanup in `stopListening()` (remove listeners, clear intervals, destroy WebSocket)
4. Create corresponding API routes for both polling and streaming
5. Add React hooks for client-side consumption

### RPC Provider Best Practices
- Server routes: Use `getServerProvider()` singleton to avoid creating multiple connections
- WebSocket streams: Use `createPulseChainProviderWithWebSocket()` for real-time events
- Always clean up WebSocket connections when streams close
- **HTTP Polling Implementation**: The watchers automatically detect if using HTTP vs WebSocket
  - WebSocket: Uses `contract.on()` for true real-time event streaming
  - HTTP: Uses manual polling with `queryFilter()` (5s interval for factory, 3s for mints)
  - This avoids the `eth_newFilter` RPC method which most public endpoints don't support
- Block time: ~10s on PulseChain

### Performance Considerations
- `includeTokenInfo` option fetches ERC20 metadata (name, symbol, decimals, balance) - significantly slower
- Default block range: 1000 blocks (~3.3 hours on PulseChain)
- Large block ranges or many tokens can cause RPC rate limiting
- Streaming mode is more efficient than polling for continuous monitoring

## Troubleshooting

**No pairs/mints showing:**
- Verify RPC URL in `.env.local` is accessible
- Check that factory addresses match PulseChain mainnet contracts
- Inspect browser console for errors

**Streaming disconnects:**
- WebSocket URLs may require specific endpoints (check RPC provider docs)
- Falls back to HTTP polling automatically
- SSE connections timeout after inactivity - reconnection is automatic

**Slow performance:**
- Disable "Include Token Info" checkbox for faster loading
- Reduce block range in API calls
- Consider using a dedicated RPC node or paid endpoint

## Sniper Bot Architecture

### Private Key Security

- Private key stored in `SNIPER_PRIVATE_KEY` environment variable (server-side only)
- Never exposed to client
- Used by `WalletService` to sign transactions
- Already in `.gitignore` via `.env*` pattern

### Server-Side Singleton Pattern

The sniper engine must run as a server-side singleton:
```typescript
// lib/sniper/server.ts (needs to be created)
let sniperInstance: SniperEngine | null = null;

export function getSniperEngine(): SniperEngine {
  if (!sniperInstance && process.env.SNIPER_PRIVATE_KEY) {
    sniperInstance = new SniperEngine(config);
    sniperInstance.initialize(process.env.SNIPER_PRIVATE_KEY);
  }
  return sniperInstance;
}
```

### Integration with Mint Stream

In `app/api/mints/stream/route.ts`, add sniper integration:
```typescript
mintWatcher.on('mint', async (mintEvent) => {
  // Existing code...

  // Add sniper handling
  const sniper = getSniperEngine();
  if (sniper?.running) {
    await sniper.handleMintEvent(mintEvent);
  }
});
```

### API Routes

All sniper API routes documented in `API_ROUTES_TODO.md`. Must be created in `app/api/sniper/` directory.

### Client-Side State

- Configuration stored in localStorage (`SNIPER_STORAGE_KEY`)
- Portfolio persisted in localStorage (`PORTFOLIO_STORAGE_KEY`)
- Limit orders managed by `PriceMonitor` (server-side)

### Important Implementation Notes

**PulseX Router:**
- Uses PulseX V2 Router: `0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02`
- WPLS address: `0xA1077a294dDE1B09bB078844df40758a5D0f9a27`
- Swaps use `swapExactETHForTokens` (buy) and `swapExactTokensForETH` (sell)

**Gas Management:**
- Gas limit = estimated gas × multiplier (default 1.2x)
- Custom gas price optional (in Gwei)
- Higher gas = faster execution but higher cost

**Limit Orders (Simulated):**
- Not native to PulseX - implemented via price monitoring
- `PriceMonitor` checks prices every 10 seconds
- When target hit → executes sell via `SwapService`
- Take profit: sell when price >= target
- Stop loss: sell when price <= target

### Testing Recommendations

1. Start with SMALL amounts (10-50 PLS)
2. Test on low-value Pump.tires launches first
3. Verify each step: detect → buy → position created → sell
4. Monitor gas fees and slippage
5. Check limit orders execute correctly

## Sniper Bot Disclaimer

**USE AT YOUR OWN RISK**

The sniper bot trades with real money on PulseChain. You can lose your entire investment. No guarantees of profit. Always DYOR (Do Your Own Research). The developers are not responsible for any losses.
