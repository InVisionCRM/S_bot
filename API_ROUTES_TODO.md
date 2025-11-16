# API Routes To-Do

The sniper bot UI is complete, but you need to create the following API routes to connect the backend.

## Required API Routes

### `/api/sniper/initialize` (POST)
Initialize sniper with private key from environment variables

**Request:**
```json
{
  "privateKey": "0x..." // from SNIPER_PRIVATE_KEY env var
}
```

**Response:**
```json
{
  "success": true,
  "address": "0x...",
  "balance": "123.45"
}
```

**Implementation:**
```typescript
import { getWalletService } from '@/lib/sniper';

export async function POST(request: Request) {
  const { privateKey } = await request.json();
  const wallet = getWalletService();
  wallet.initializeWallet(privateKey);
  const address = wallet.getAddress();
  const balance = await wallet.getBalance();
  return Response.json({ success: true, address, balance });
}
```

---

### `/api/sniper/start` (POST)
Start the sniper bot

**Request:**
```json
{
  "config": { /* SniperConfig */ }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sniper started"
}
```

---

### `/api/sniper/stop` (POST)
Stop the sniper bot

**Response:**
```json
{
  "success": true,
  "message": "Sniper stopped"
}
```

---

### `/api/sniper/status` (GET)
Get sniper status

**Response:**
```json
{
  "isRunning": true,
  "isInitialized": true,
  "walletAddress": "0x...",
  "balance": "123.45"
}
```

---

### `/api/sniper/balance` (GET)
Get wallet balance

**Response:**
```json
{
  "balance": "123.45"
}
```

---

### `/api/sniper/portfolio` (GET)
Get all positions

**Response:**
```json
{
  "positions": [/* TokenPosition[] */]
}
```

---

### `/api/sniper/sell/[tokenAddress]` (POST)
Sell a position

**Request:**
```json
{
  "amount": "1000" // optional, sells all if not provided
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x..."
}
```

---

### `/api/sniper/limit-orders` (GET)
Get all limit orders

**Response:**
```json
{
  "orders": [/* LimitOrder[] */]
}
```

---

### `/api/sniper/limit-orders` (POST)
Create a limit order

**Request:**
```json
{
  "tokenAddress": "0x...",
  "orderType": "take_profit" | "stop_loss",
  "targetPricePLS": "200",
  "amountTokens": "1000"
}
```

**Response:**
```json
{
  "success": true,
  "order": { /* LimitOrder */ }
}
```

---

### `/api/sniper/limit-orders/[orderId]` (DELETE)
Cancel a limit order

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled"
}
```

---

## Implementation Steps

1. Create `app/api/sniper/` directory structure
2. Implement each route file
3. Create a server-side sniper engine singleton
4. Connect the mint stream to call `sniperEngine.handleMintEvent()`
5. Test with small amounts!

## Server-Side Integration

The sniper needs to run on the server and listen to mint events. Here's the key integration:

### In `/app/api/mints/stream/route.ts`:

```typescript
import { getSniperEngine } from '@/lib/sniper/server'; // You need to create this

// In the mint watcher callback:
watcher.on('mint', async (mintEvent) => {
  const sniperEngine = getSniperEngine();
  if (sniperEngine && sniperEngine.running) {
    await sniperEngine.handleMintEvent(mintEvent);
  }

  // ... rest of mint handling code
});
```

## Notes

- The sniper engine should be a **server-side singleton**
- Initialize once with the private key from `process.env.SNIPER_PRIVATE_KEY`
- Portfolio and limit orders should use the client-side services (localStorage)
- Price monitoring should run server-side for reliability

## Testing Checklist

Before using with real funds:

- [ ] Initialize wallet successfully
- [ ] Start/stop sniper
- [ ] Auto-buy triggers on mint event (test with 10 PLS)
- [ ] Position shows in portfolio
- [ ] Manual sell works
- [ ] Limit orders are created
- [ ] Limit orders execute when price target hit
- [ ] Portfolio persists across page reloads

## Quick Start Template

Create `/app/api/sniper/status/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { getSniperEngine } from '@/lib/sniper/server';

export async function GET(request: NextRequest) {
  const sniper = getSniperEngine();

  return Response.json({
    isRunning: sniper.running,
    isInitialized: sniper.initialized,
    walletAddress: sniper.getWalletAddress(),
    balance: await sniper.getBalance(),
  });
}
```

Then replicate this pattern for all other routes!
