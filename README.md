# PulseChain Token Sniper Bot & Watcher Dashboard

A real-time dashboard for monitoring newly created token pairs on PulseChain via PulseX V1 and V2 factory contracts. The dashboard tracks when tokens are minted and monitors a specific address for token holdings.

**🎯 NEW: Automated Pump.tires Sniper Bot** - Auto-buy new token launches with configurable settings, limit orders, and portfolio tracking!

## Features

### Monitoring Features
- 🔍 **Real-time Monitoring**: Track new token pairs as they're created on PulseChain
- 📊 **Dual Factory Support**: Monitor both PulseX V1 and V2 factory contracts
- 🎯 **Address Tracking**: Watch specific addresses for token holdings in new pairs
- 📈 **Live Dashboard**: Beautiful, responsive UI with real-time updates
- 🔄 **Dual Modes**: Choose between polling (HTTP) or streaming (Server-Sent Events)

### Sniper Bot Features (NEW!)
- 🤖 **Auto-Buy**: Automatically buy Pump.tires tokens on launch
- 💰 **Manual Controls**: Configure buy amount, slippage, and gas
- 📉 **Limit Orders**: Simulated take-profit and stop-loss orders
- 💼 **Portfolio Tracking**: Track positions, P/L, and trade history
- ⚡ **Fast Execution**: PulseX router integration for quick swaps

### Tech Stack
- 🎨 **Modern UI**: Built with Next.js 16, Tailwind CSS, and TypeScript
- ⛓️ **Blockchain**: Ethers.js v6 for PulseChain interaction

## Configuration

### Watched Address
- **Address**: `0x6538A83a81d855B965983161AF6a83e616D16fD5`

### Factory Contracts
- **V1 Factory**: `0x1715a3E4A142d8b698131108995174F37aEBA10D`
- **V2 Factory**: `0x29eA7545DEf87022BAdc76323F373EA1e707C523`

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- PulseChain RPC endpoint (public or your own node)

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file (copy from `.env.example`):

```bash
cp .env.example .env.local
```

3. Configure your PulseChain RPC endpoint in `.env.local`:

```env
NEXT_PUBLIC_PULSECHAIN_RPC_URL=https://rpc.pulsechain.com
```

Optional: For real-time streaming, configure WebSocket endpoint:

```env
NEXT_PUBLIC_PULSECHAIN_WS_URL=wss://rpc.pulsechain.com/ws
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Setup Sniper Bot (Optional)

To enable the automated Pump.tires sniper bot:

1. Add your private key to `.env.local`:
```env
SNIPER_PRIVATE_KEY=0xyourprivatekeyhere
```

2. Restart the dev server
3. See [SNIPER_SETUP.md](./SNIPER_SETUP.md) for detailed setup instructions

⚠️ **Security**: Use a dedicated wallet. Never commit your private key!

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
wallet-dashboard/
├── app/
│   ├── api/
│   │   └── pairs/
│   │       ├── route.ts          # REST API for fetching pairs
│   │       └── stream/
│   │           └── route.ts      # SSE endpoint for real-time updates
│   ├── page.tsx                   # Main dashboard page
│   └── layout.tsx                 # Root layout
├── components/
│   ├── pair-card.tsx              # Individual pair display card
│   └── pairs-list.tsx             # List component with filters
├── config/
│   └── pulsechain.ts              # PulseChain configuration
├── lib/
│   ├── blockchain/
│   │   ├── provider.ts            # Blockchain provider setup
│   │   ├── factory-watcher.ts     # Factory contract watcher
│   │   └── token-info.ts          # Token information fetcher
│   └── hooks/
│       └── use-pairs.ts           # React hooks for data fetching
└── types/
    └── contracts.ts               # TypeScript type definitions
```

## Usage

### Dashboard Modes

1. **Polling Mode**: 
   - Fetches pairs via HTTP at regular intervals (default: 15 seconds)
   - Good for initial load and periodic updates
   - Click "Refresh" for manual updates

2. **Streaming Mode**:
   - Real-time updates via Server-Sent Events (SSE)
   - Instant notifications when new pairs are created
   - Requires stable connection

### Features

- **Search**: Filter pairs by address, symbol, or token name
- **Filter**: View all pairs, V1 only, V2 only, or pairs with watched address holdings
- **Sort**: Sort by newest, oldest, or block number
- **Token Info**: Toggle detailed token information (slower but more informative)
- **Watch Highlights**: Pairs where the watched address holds tokens are highlighted in green

### API Endpoints

#### GET `/api/pairs`
Fetch recent pairs (last 1000 blocks by default)

Query Parameters:
- `blockRange` (number): Number of blocks to look back (default: 1000)
- `includeTokenInfo` (boolean): Include detailed token information (default: false)

Example:
```bash
curl http://localhost:3000/api/pairs?blockRange=500&includeTokenInfo=true
```

#### GET `/api/pairs/stream`
Stream new pairs in real-time via Server-Sent Events

Example:
```javascript
const eventSource = new EventSource('/api/pairs/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_pair') {
    console.log('New pair:', data.data);
  }
};
```

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Blockchain**: Ethers.js v6
- **Styling**: Tailwind CSS v4
- **Real-time**: Server-Sent Events (SSE)

## Configuration Options

Edit `config/pulsechain.ts` to customize:

- Chain ID
- Factory contract addresses
- Watched address
- Polling intervals
- Block confirmation thresholds

## Development

### Code Style

- Uses TypeScript strict mode
- Follows Next.js App Router patterns
- Client components marked with `'use client'`
- Server components for API routes

### Environment Variables

- `NEXT_PUBLIC_PULSECHAIN_RPC_URL`: HTTP RPC endpoint (required)
- `NEXT_PUBLIC_PULSECHAIN_WS_URL`: WebSocket RPC endpoint (optional)

## Troubleshooting

### No pairs showing up
- Verify your RPC endpoint is correct and accessible
- Check browser console for errors
- Ensure factory contract addresses are correct for PulseChain mainnet

### Streaming not working
- Verify WebSocket URL is configured (optional, falls back to HTTP)
- Check server logs for connection errors
- Try switching to polling mode

### Slow performance
- Disable "Include Token Info" for faster loading
- Reduce `blockRange` parameter
- Use a faster RPC endpoint or run your own PulseChain node

## License

MIT

## Disclaimer

This tool is for monitoring and educational purposes. Always verify smart contracts and do your own research before interacting with tokens or trading. Use at your own risk.
