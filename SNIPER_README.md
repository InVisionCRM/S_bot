# Pump.tires Sniper Bot

Automated token buying bot for Pump.tires token launches on PulseChain.

## ⚠️ IMPORTANT SECURITY NOTICE

**NEVER commit your private key to git!** The `.env.local` file contains your wallet's private key and should NEVER be shared or committed.

## Features

- ✅ **Auto-Buy**: Automatically buy new Pump.tires tokens when they launch
- ✅ **Manual Controls**: Configure buy amount, slippage, and gas for each trade
- ✅ **Limit Orders**: Simulated limit orders for take-profit and stop-loss
- ✅ **Portfolio Tracking**: Track all your sniped positions and P/L
- ✅ **Price Monitoring**: Real-time price updates for your holdings

## Setup

### 1. Add Your Private Key

Edit `.env.local` and add your wallet's private key:

```bash
SNIPER_PRIVATE_KEY=0xyourprivatekeyhere
```

**How to get your private key:**
- MetaMask: Settings → Security & Privacy → Show private key
- Other wallets: Check your wallet's export/backup options

**Security Tips:**
- ✅ Use a dedicated wallet for sniping (not your main wallet)
- ✅ Only fund it with what you're willing to risk
- ✅ Never share your private key with anyone
- ✅ The `.env.local` file is already in `.gitignore`

### 2. Configure Sniper Settings

The sniper uses these default settings (configurable in UI):

```typescript
{
  autoBuyEnabled: false,       // Toggle auto-buy on/off
  buyAmountPLS: '100',         // Amount in PLS per snipe
  slippagePercent: 10,         // 10% slippage tolerance
  gasLimitMultiplier: 1.2,     // 120% of estimated gas
  gasPriceGwei: undefined,     // Use network default gas price

  autoSellEnabled: false,      // Toggle auto-sell (limit orders)
  takeProfitPercent: 100,      // Sell at 2x (100% profit)
  stopLossPercent: 50,         // Sell at -50% loss
}
```

## How It Works

### 1. Token Detection

The sniper monitors Transfer events from the zero address (`0x000...000`) to the Pump.tires contract (`0x6538A83a81d855B965983161AF6a83e616D16fD5`).

When a new token is minted to Pump.tires = new token launch detected! 🎯

### 2. Auto-Buy Execution

When auto-buy is enabled:
1. New Pump.tires token detected
2. Sniper executes swap via PulseX router
3. Buys tokens using your configured PLS amount
4. Transaction confirmed
5. Position added to portfolio

### 3. Auto-Sell (Limit Orders)

If auto-sell is enabled, the bot creates limit orders:

**Take Profit:** Automatically sells when profit target is hit
- Example: Buy at 100 PLS → Sell at 200 PLS (2x)

**Stop Loss:** Automatically sells when loss threshold is hit
- Example: Buy at 100 PLS → Sell at 50 PLS (-50%)

The price monitor checks prices every 10 seconds and executes orders when targets are hit.

## Usage

### Via UI (Recommended)

1. Navigate to the Mints tab
2. Enable "Sniper Bot" toggle
3. Configure your settings:
   - Buy amount (PLS per snipe)
   - Slippage tolerance
   - Gas settings
   - Auto-sell options
4. Click "Start Sniping"
5. Monitor your positions in the Portfolio section

### Via Code

```typescript
import { SniperEngine, DEFAULT_SNIPER_CONFIG } from '@/lib/sniper';

// Initialize
const sniper = new SniperEngine(DEFAULT_SNIPER_CONFIG);
sniper.initialize(process.env.SNIPER_PRIVATE_KEY!);

// Start sniping
sniper.start();

// Listen for snipe results
sniper.onSnipe((result) => {
  console.log('Snipe result:', result);
});

// Handle mint events
mintWatcher.on('mint', (mintEvent) => {
  sniper.handleMintEvent(mintEvent);
});
```

## Configuration Options

### Buy Settings

- **Buy Amount**: Amount of PLS to spend per snipe (e.g., `"100"` for 100 PLS)
- **Slippage**: Maximum price slippage tolerance (e.g., `10` for 10%)
- **Gas Limit Multiplier**: Multiply estimated gas (e.g., `1.2` for 120%)
- **Gas Price**: Optional custom gas price in Gwei (e.g., `"50"`)

### Auto-Sell Settings

- **Take Profit %**: Profit percentage to trigger sell (e.g., `100` for 2x, `200` for 3x)
- **Stop Loss %**: Loss percentage to trigger sell (e.g., `50` for -50%)

## Portfolio Management

### View Positions

```typescript
import { getPortfolioService } from '@/lib/sniper';

const portfolio = getPortfolioService();

// Get all positions
const positions = portfolio.getAllPositions();

// Get holding positions only
const holdings = portfolio.getHoldingPositions();

// Get stats
const stats = portfolio.getPortfolioStats();
```

### Manual Sell

```typescript
// Sell specific position
await sniper.sellToken(tokenAddress, amount);

// Sell entire position
await sniper.sellToken(tokenAddress);
```

### Limit Orders

```typescript
import { AutoSellEngine } from '@/lib/sniper';

// Create manual limit order
const order = autoSell.createLimitOrder(
  tokenAddress,
  'take_profit',  // or 'stop_loss'
  '200',          // target price in PLS
  '1000000'       // amount of tokens to sell
);

// Cancel limit order
autoSell.cancelLimitOrder(order.id);
```

## API Endpoints

### GET `/api/sniper/config`
Get current sniper configuration

### POST `/api/sniper/config`
Update sniper configuration

### GET `/api/sniper/portfolio`
Get all positions

### POST `/api/sniper/buy/:tokenAddress`
Manually trigger buy for specific token

### POST `/api/sniper/sell/:tokenAddress`
Manually sell position

### GET `/api/sniper/status`
Get sniper status (running, wallet address, balance)

## Safety & Best Practices

### Risk Management

1. **Start Small**: Test with small amounts (10-50 PLS) first
2. **Dedicated Wallet**: Use a separate wallet just for sniping
3. **Monitor Closely**: Watch your first few snipes carefully
4. **Set Limits**: Use stop losses to limit downside risk
5. **Take Profits**: Don't be greedy, take profits on the way up

### Common Issues

**"Wallet not initialized"**
- Make sure `SNIPER_PRIVATE_KEY` is set in `.env.local`
- Private key should start with `0x`
- Restart dev server after adding key

**"Insufficient funds"**
- Make sure your wallet has enough PLS
- Account for gas fees (keep extra 10-20 PLS for gas)

**"Transaction failed"**
- Slippage too low? Try increasing to 15-20%
- Gas too low? Increase gas limit multiplier
- No liquidity yet? Token might not be tradeable immediately

**"Auto-sell not working"**
- Make sure `autoSellEnabled` is `true`
- Price monitor runs every 10 seconds
- Check that limit orders were created (check logs)

### Performance Optimization

**Faster Sniping:**
1. Use a premium RPC endpoint (faster than public)
2. Increase gas price for priority
3. Set gas limit multiplier to 1.5x
4. Higher slippage = higher success rate (but worse price)

**Cheaper Gas:**
1. Use default gas price (network average)
2. Lower gas limit multiplier to 1.1x
3. Trade speed for cost

## Development

### File Structure

```
lib/sniper/
├── sniper-engine.ts      # Main sniper logic
├── wallet-service.ts     # Wallet & transaction signing
├── swap-service.ts       # PulseX router interaction
├── portfolio-service.ts  # Position tracking
├── price-monitor.ts      # Price monitoring for limit orders
├── auto-sell-engine.ts   # Limit order execution
└── index.ts              # Exports

types/sniper.ts           # TypeScript types
config/sniper.ts          # Default configuration
```

### Extending the Bot

**Add custom filters:**
```typescript
sniper.onSnipe((result) => {
  // Custom logic after each snipe
  if (result.success) {
    // Send notification, log to database, etc.
  }
});
```

**Custom limit order logic:**
```typescript
autoSell.onSell((position, order) => {
  // Custom logic when limit order executes
  console.log(`Sold ${position.tokenSymbol} at ${order.targetPricePLS} PLS`);
});
```

## Disclaimer

**USE AT YOUR OWN RISK**

- This bot trades with real money on PulseChain
- You can lose your entire investment
- No guarantees of profit
- Not financial advice
- Always DYOR (Do Your Own Research)
- Test thoroughly before using real funds
- The developers are not responsible for any losses

## Support

Issues? Check the main README.md or create a GitHub issue.

Happy sniping! 🚀
