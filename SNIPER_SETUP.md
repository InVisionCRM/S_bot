# 🎯 Sniper Bot Setup Guide

Quick setup guide to get your Pump.tires sniper bot running.

## Step 1: Add Your Private Key

1. Open `.env.local` in your project root
2. Add your wallet's private key:

```bash
SNIPER_PRIVATE_KEY=0xyourprivatekeyhere
```

**How to get your private key:**
- **MetaMask**: Settings → Security & Privacy → Show private key
- **Other wallets**: Check export/backup options

⚠️ **SECURITY WARNING:**
- Use a **dedicated wallet** for sniping (not your main wallet)
- Only fund it with what you're willing to risk
- **NEVER share** your private key
- The `.env.local` file is in `.gitignore` (safe from git commits)

## Step 2: Fund Your Sniper Wallet

1. Send PLS to your sniper wallet address
2. Recommended starting amount: **500-1000 PLS**
   - For trades: 100-200 PLS per snipe
   - For gas fees: Keep extra 100+ PLS

## Step 3: Restart Dev Server

After adding your private key, restart the development server:

```bash
# Stop current server (Ctrl+C or Cmd+C)
npm run dev
```

## Step 4: Configure Sniper Settings

Navigate to your dashboard at http://localhost:3000

### Configure Buy Settings:

1. **Buy Amount**: How much PLS to spend per snipe (e.g., `100`)
2. **Slippage**: Max price slippage tolerance (recommend: `10-15%`)
3. **Gas Limit Multiplier**: Multiply estimated gas (recommend: `1.2`)
4. **Gas Price**: Leave empty for network default (or set custom for faster execution)

### Configure Auto-Sell (Optional):

1. Enable "Auto-Sell" toggle
2. **Take Profit %**: Profit target (e.g., `100` for 2x, `200` for 3x)
3. **Stop Loss %**: Loss threshold (e.g., `50` for -50% loss)

## Step 5: Start Sniping!

1. Enable **"Auto-Buy"** toggle in settings
2. Click **"▶ Start Sniping"** button
3. Watch the Mints tab for Pump.tires launches
4. Monitor your Portfolio tab for positions

## How It Works

### Detection
- Monitors Transfer events from zero address (`0x000...000`)
- Filters for transfers TO Pump.tires contract (`0x6538A83a81d855B965983161AF6a83e616D16fD5`)
- When detected = new Pump.tires token! 🎯

### Auto-Buy
1. New token detected
2. Sniper executes swap via PulseX router
3. Buys tokens with your configured PLS amount
4. Transaction confirmed
5. Position added to portfolio

### Auto-Sell (Limit Orders)
If enabled, creates two limit orders per position:
- **Take Profit**: Sells when profit target hit
- **Stop Loss**: Sells when loss threshold hit

Price monitor checks every 10 seconds and executes when targets are met.

## Testing First Snipe

**START SMALL!** Test with 10-50 PLS first.

1. Set **Buy Amount**: `10` (just 10 PLS for testing)
2. Set **Slippage**: `15%`
3. Enable **Auto-Buy**
4. Click **Start Sniping**
5. Wait for next Pump.tires launch
6. Check Portfolio tab to see your position

## Common Settings

### Conservative (Safer)
```
Buy Amount: 50 PLS
Slippage: 10%
Gas Multiplier: 1.2
Take Profit: 100% (2x)
Stop Loss: 50% (-50%)
```

### Aggressive (Faster/Riskier)
```
Buy Amount: 200 PLS
Slippage: 20%
Gas Multiplier: 1.5
Gas Price: 50 Gwei
Take Profit: 200% (3x)
Stop Loss: 30% (-30%)
```

### Speed Demon (Fastest Execution)
```
Buy Amount: 100 PLS
Slippage: 25%
Gas Multiplier: 2.0
Gas Price: 100 Gwei
(Higher fees, but fastest execution)
```

## Monitoring

### Dashboard View
- **Sniper Settings**: Configure and start/stop
- **Portfolio**: Track positions and P/L
- **Limit Orders**: View and manage auto-sell orders
- **Mints Tab**: See incoming Pump.tires launches in real-time

### What to Watch
- ✅ Green "Sniper Bot Active" indicator
- ✅ Wallet balance (keep enough for gas)
- ✅ New positions appearing in Portfolio
- ✅ Limit orders executing automatically

## Troubleshooting

### "Wallet not initialized"
- Make sure `SNIPER_PRIVATE_KEY` is in `.env.local`
- Private key must start with `0x`
- Restart dev server after adding

### "Insufficient funds"
- Your wallet needs more PLS
- Keep extra for gas fees (10-20 PLS minimum)

### "Transaction failed"
- Slippage too low? Increase to 15-20%
- Gas too low? Increase multiplier to 1.5x
- Try increasing gas price (50-100 Gwei)

### Auto-sell not working
- Check `autoSellEnabled` is true
- Verify limit orders were created (check Limit Orders tab)
- Price monitor runs every 10 seconds (be patient)

### Not buying new launches
- Check `autoBuyEnabled` is true
- Verify sniper is running (green indicator)
- Make sure you have enough PLS balance
- Check console logs for errors

## Safety Tips

1. ✅ **Start with small amounts** (10-50 PLS) to test
2. ✅ **Use dedicated wallet** (not your main funds)
3. ✅ **Monitor closely** at first
4. ✅ **Set stop losses** to limit downside
5. ✅ **Take profits** along the way (don't be greedy)
6. ⚠️ **Never share** your private key
7. ⚠️ **Only risk** what you can afford to lose

## Next Steps

Once comfortable:
1. Increase buy amounts gradually
2. Experiment with different settings
3. Track your win rate in Portfolio
4. Adjust strategy based on results

## Need Help?

- Check console logs for detailed error messages
- Review SNIPER_README.md for advanced features
- Report issues on GitHub

Happy sniping! 🚀

Remember: **This is real money. Use at your own risk. Not financial advice.**
