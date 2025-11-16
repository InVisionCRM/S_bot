# ✅ Sniper Bot Setup COMPLETE!

Your Pump.tires sniper bot is **fully integrated** and ready to use!

## 🎉 What Was Completed

### ✅ All API Routes Created
- `/api/sniper/status` - Get sniper status
- `/api/sniper/start` - Start sniping
- `/api/sniper/stop` - Stop sniping
- `/api/sniper/balance` - Get wallet balance
- `/api/sniper/portfolio` - Get all positions
- `/api/sniper/sell/[tokenAddress]` - Sell tokens
- `/api/sniper/limit-orders` - Get/create limit orders
- `/api/sniper/limit-orders/[orderId]` - Cancel limit orders

### ✅ Server Integration Complete
- Created `/lib/sniper/server.ts` - Server-side singleton
- Integrated with mint stream in `/app/api/mints/stream/route.ts`
- Sniper automatically triggers on Pump.tires mint events
- Auto-sell creates limit orders for new positions

### ✅ UI Integration Complete
- Added "🎯 Sniper" tab to main dashboard
- Settings panel with all controls
- Portfolio view with P/L tracking
- Limit orders management
- Beautiful, responsive UI

### ✅ Private Key Configured
- Your private key is set in `.env.local`
- Wallet will initialize automatically on server start
- Already in `.gitignore` (safe from commits)

## 🚀 How To Use

### 1. Restart Your Dev Server

**IMPORTANT**: You need to restart the dev server for the new API routes and private key to load.

```bash
# Stop current server (Ctrl+C or Cmd+C)
# Then restart:
npm run dev
```

### 2. Navigate to Dashboard

Open http://localhost:3000 in your browser

### 3. Go to Sniper Tab

Click the **"🎯 Sniper"** button in the top navigation

### 4. Configure Settings

**Recommended First Test:**
- Buy Amount: `10` PLS (start SMALL!)
- Slippage: `15%`
- Gas Limit Multiplier: `1.2`
- Enable "Auto-Buy" toggle
- (Optional) Enable "Auto-Sell" with 100% take profit, 50% stop loss

### 5. Start Sniping!

Click **"▶ Start Sniping"** button

You should see:
- ✅ Green "Sniper Bot Active" indicator
- ✅ Your wallet address and balance
- ✅ Status showing "Auto-buy enabled"

### 6. Monitor

- **Mints Tab**: Watch for new Pump.tires launches (mints to `0x6538A83a81d855B965983161AF6a83e616D16fD5`)
- **Sniper Tab → Portfolio**: See your positions as they're created
- **Sniper Tab → Limit Orders**: See auto-sell orders

## 🎯 What Happens When a Token Launches

1. **Detection**: Mint event detected to Pump.tires contract
2. **Auto-Buy**: Sniper executes PulseX swap (if enabled)
3. **Position Created**: Shows in Portfolio with buy price
4. **Limit Orders**: Auto-created (if auto-sell enabled)
   - Take Profit: Sells at 2x (or your configured %)
   - Stop Loss: Sells at -50% (or your configured %)
5. **Price Monitoring**: Checks every 10 seconds
6. **Auto-Sell**: Executes when price target hit

## 📊 Dashboard Views

### Mints Tab
- See all mint events to Pump.tires contract
- Real-time updates (streaming mode)
- Shows when new tokens launch

### Sniper Tab
- **Settings Panel**: Configure all bot settings
- **Portfolio**: View positions, P/L, manual sell
- **Limit Orders**: Manage take-profit/stop-loss orders

### Pairs Tab
- PulseX V1/V2 pair creation events
- Not related to sniper (separate monitoring)

## ⚙️ Settings Explained

### Buy Settings
- **Buy Amount**: PLS to spend per snipe (e.g., `100`)
- **Slippage**: Max price change tolerance (recommend: 10-15%)
- **Gas Limit Multiplier**: Safety margin for gas (recommend: 1.2)
- **Gas Price**: Custom gas in Gwei (leave empty for auto)

### Auto-Sell Settings
- **Take Profit %**: Profit target (e.g., `100` = 2x, `200` = 3x)
- **Stop Loss %**: Loss threshold (e.g., `50` = -50%)

## 🧪 Testing Checklist

Before using with real amounts:

- [ ] Restart dev server
- [ ] Navigate to Sniper tab
- [ ] See wallet address and balance displayed
- [ ] Set buy amount to `10` PLS
- [ ] Enable Auto-Buy
- [ ] Click "Start Sniping"
- [ ] See green "Sniper Bot Active" indicator
- [ ] Wait for next Pump.tires launch (watch Mints tab)
- [ ] Verify position appears in Portfolio
- [ ] Try manual sell
- [ ] Verify limit orders created (if auto-sell enabled)

## 📝 Example Workflow

### Conservative Strategy
```
Buy Amount: 50 PLS
Slippage: 10%
Auto-Buy: ✅ Enabled
Auto-Sell: ✅ Enabled
Take Profit: 100% (2x)
Stop Loss: 50% (-50%)
```

### Aggressive Strategy
```
Buy Amount: 200 PLS
Slippage: 20%
Gas Price: 50 Gwei
Auto-Buy: ✅ Enabled
Auto-Sell: ✅ Enabled
Take Profit: 200% (3x)
Stop Loss: 30% (-30%)
```

## ⚠️ Important Notes

### Security
- ✅ Your private key is secure (server-side only)
- ✅ Never exposed to browser/client
- ✅ Already in `.gitignore`
- ⚠️ **NEVER share your private key with anyone!**

### Risk Management
- ⚠️ **Start with SMALL amounts** (10-50 PLS)
- ⚠️ Use a **dedicated wallet** (not your main funds)
- ⚠️ This is **real money** - you can lose it all
- ⚠️ **No guarantees** of profit
- ⚠️ **Not financial advice** - DYOR

### Performance Tips
- Use a faster RPC for quicker execution
- Increase gas price for faster transactions
- Higher slippage = better success rate (but worse price)
- Monitor closely during first few snipes

## 🐛 Troubleshooting

### "Sniper not initialized"
- Restart dev server after adding private key
- Check private key starts with `0x`
- Check `.env.local` file saved correctly

### "Insufficient funds"
- Need more PLS in wallet
- Keep extra for gas fees (10-20 PLS)

### "Transaction failed"
- Increase slippage to 15-20%
- Increase gas limit multiplier to 1.5x
- Try custom gas price (50-100 Gwei)

### Not auto-buying
- Check "Auto-Buy" toggle is enabled
- Verify "Start Sniping" button was clicked
- Check wallet has enough PLS balance
- Look at console logs for errors (F12 → Console)

### Auto-sell not working
- Check "Auto-Sell" toggle is enabled
- Wait at least 10 seconds (price monitor interval)
- Verify limit orders created (check Limit Orders panel)
- Check console logs for errors

## 📚 Documentation

- **SNIPER_SETUP.md** - Detailed setup guide
- **SNIPER_README.md** - Feature documentation
- **SNIPER_COMPLETE.md** - Implementation summary
- **API_ROUTES_TODO.md** - API reference (now complete!)

## 🎊 You're All Set!

Everything is ready. Just restart your dev server and start sniping!

**Steps:**
1. Restart dev server: `npm run dev`
2. Navigate to: http://localhost:3000
3. Click: **"🎯 Sniper"** tab
4. Configure settings
5. Click: **"▶ Start Sniping"**
6. Watch the magic happen! 🚀

---

**Good luck and happy sniping!**

Remember: Start small, test thoroughly, and only risk what you can afford to lose.

*Disclaimer: This trades real money. You can lose your entire investment. No guarantees. Not financial advice. Use at your own risk. DYOR.*
