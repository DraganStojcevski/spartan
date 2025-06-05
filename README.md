# 🤖 Hash Hunter – Telegram Bot for Solana Wallets & Token Swaps

Hash Hunter is a powerful Telegram bot that allows users to:

- 📥 Securely import their Solana wallets
- 💰 Check SOL balances
- 📈 Get real-time token prices
- 🔄 Swap tokens using Jupiter Aggregator
- 🪙 View supported token list

## ✨ Features

- `/start` – Welcome message
- `/import` – Securely import a wallet via private key (base58 or array)
- `/wallets` – View all imported wallets
- `/deletewallets` – Delete all wallets
- `/balance` – Check SOL balance of stored wallet
- `/price <symbol>` – Check token price (e.g., `/price bonk`)
- `/swap <FROM> <TO> <AMOUNT>` – Swap tokens (e.g., `/swap SOL USDC 0.1`)
- `/tokens` – List all supported token symbols
- `/help` – Show command list

### ✅ Supported Tokens (default)
- SOL
- USDC
- USDT
- BONK
- OCTO (OctonetAI)

---

## 🛠️ Setup

### 1. Clone the project

```bash
git clone <your-repo-url>
cd hash-hunter
