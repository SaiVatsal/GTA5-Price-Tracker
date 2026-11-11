# GTA V Steam Price Tracker & Telegram Notifier 🚨🎮

An automated, serverless cloud tracker running on **GitHub Actions** that tracks the price of **Grand Theft Auto V** on the Steam Store in real time (₹ INR). Whenever a price drop, seasonal sale, or price change happens, it immediately pushes a rich notification to your Telegram!

---

## ⚡ Features
- **Zero Server Costs:** Runs 100% free on GitHub Actions cron schedule.
- **Real-Time Steam Pricing:** Fetches live official pricing from Steam's official store API.
- **Instant Telegram Alerts:** Sends price drop notifications with old price, new price, discount percentage, total savings, and direct purchase link.
- **State Persistence:** Automatically saves price state across runs using git commits.

---

## 🔐 GitHub Secrets Required
| Secret Name | Value | Description |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | `9124625722:...` | Your Telegram Bot Token from @BotFather |
| `TELEGRAM_CHAT_ID` | `7986634426` | Your Telegram User ID |
