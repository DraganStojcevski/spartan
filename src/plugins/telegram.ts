import { Telegraf } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../utils/crypto';
import { Keypair, Connection } from '@solana/web3.js';
import { getPrice } from '../utils/price';
import bs58 from 'bs58';
import { getJupiterQuote, executeJupiterSwap, TOKEN_MINTS } from '../utils/jupiter';

const prisma = new PrismaClient();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const awaitingPrivateKey: Record<number, boolean> = {};
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const pendingSwaps: Record<number, { quote: any; keypair: Keypair }> = {};


export async function runTelegramPlugin() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  console.log('TELEGRAM_BOT_TOKEN:', token);
  console.log('✅ Starting Telegram bot...');

  bot.start((ctx) => {
    ctx.reply('🤖 Welcome to Hash Hunter!\nUse /import to securely add your wallet.');
  });

  bot.command('import', (ctx) => {
    ctx.reply('🔐 Send your Solana **PRIVATE KEY** (array format or base58).');
    awaitingPrivateKey[ctx.from.id] = true;
  });

  bot.command('wallets', async (ctx) => {
    const userId = ctx.from.id.toString();
    const wallets = await prisma.wallet.findMany({ where: { userId } });

    if (!wallets.length) {
      ctx.reply('❌ No wallets found. Use /import to add one.');
      return;
    }

    const list = wallets.map((wallet, i) => `#${i + 1}: ${wallet.publicKey}`).join('\n');
    ctx.reply(`🧾 Your wallets:\n${list}`);
  });

  bot.command('balance', async (ctx) => {
    const userId = ctx.from.id.toString();
    const wallet = await prisma.wallet.findFirst({ where: { userId } });

    if (!wallet) {
      ctx.reply('❌ No wallet found. Use /import to add one.');
      return;
    }

    try {
      const decrypted = decrypt(wallet.privateKey);
      const keypair = decrypted.trim().startsWith('[')
        ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(decrypted)))
        : Keypair.fromSecretKey(bs58.decode(decrypted));

      const connection = new Connection(SOLANA_RPC);
      const lamports = await connection.getBalance(keypair.publicKey);
      ctx.reply(`💰 Balance for ${keypair.publicKey.toBase58()}:\nSOL: ${(lamports / 1e9).toFixed(4)} ◎`);
    } catch (err) {
      console.error('❌ Balance error:', err);
      ctx.reply('❌ Failed to fetch balance.');
    }
  });

  bot.command('deletewallets', async (ctx) => {
    const userId = ctx.from.id.toString();
    const deleted = await prisma.wallet.deleteMany({ where: { userId } });
    ctx.reply(`🗑️ Deleted ${deleted.count} wallet(s).`);
  });

  bot.command('price', async (ctx) => {
    const parts = ctx.message.text.trim().split(' ');
    if (parts.length < 2) {
      ctx.reply('❓ Usage: /price <symbol>\nExample: /price bonk');
      return;
    }

    const result = await getPrice(parts[1]);
    if (!result) {
      ctx.reply(`❌ Token "${parts[1]}" not found.`);
      return;
    }

    const { price, change, marketCap } = result;
    ctx.reply(`💰 ${parts[1].toUpperCase()} Price\nUSD: $${price}\n24h Change: ${change}%\nMarket Cap: $${marketCap}`);
  });

  bot.command('swap', async (ctx) => {
    const userId = ctx.from.id.toString();
    const parts = ctx.message.text.trim().split(' ');
    if (parts.length !== 4) {
      ctx.reply('❓ Usage: /swap <FROM> <TO> <AMOUNT>');
      return;
    }

    const [, fromSymbol, toSymbol, amountStr] = parts;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      ctx.reply('❌ Invalid amount.');
      return;
    }

    const wallet = await prisma.wallet.findFirst({ where: { userId } });
    if (!wallet) {
      ctx.reply('❌ No wallet found. Use /import to add one.');
      return;
    }

    try {
      const decrypted = decrypt(wallet.privateKey);
      const keypair = decrypted.trim().startsWith('[')
        ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(decrypted)))
        : Keypair.fromSecretKey(bs58.decode(decrypted));

      const publicKey = keypair.publicKey.toBase58();
      ctx.reply(`🔍 Getting quote to swap ${amount} ${fromSymbol.toUpperCase()} → ${toSymbol.toUpperCase()}...`);

      const quote = await getJupiterQuote(fromSymbol, toSymbol, amount, publicKey);
      if (!quote) {
        ctx.reply(`❌ No quote found for ${fromSymbol} to ${toSymbol}.`);
        return;
      }

      const amountOut = quote.outAmount / (10 ** quote.outputDecimals);
      ctx.reply(
        `🧾 Best route:\n${amount} ${fromSymbol.toUpperCase()} → ${amountOut.toFixed(6)} ${toSymbol.toUpperCase()}\n\n⚠️ Reply with **YES** to confirm.`
      );

      pendingSwaps[ctx.from.id] = { quote, keypair };
    } catch (err) {
      console.error('❌ Swap preparation error:', err);
      ctx.reply('❌ Failed to prepare swap.');
    }
  });

  bot.hears(/^YES$/i, async (ctx) => {
    const swapData = pendingSwaps[ctx.from.id];
    if (!swapData) {
      ctx.reply('❌ No pending swap found. Use /swap to start again.');
      return;
    }

    ctx.reply('⛓ Executing swap...');

    try {
      const txid = await executeJupiterSwap(swapData.quote, swapData.keypair);
      ctx.reply(`✅ Swap successful!\n🔗 https://solscan.io/tx/${txid}`);
    } catch (err) {
      console.error('❌ Swap error:', err);
      ctx.reply('❌ Swap failed. Try again later.');
    } finally {
      delete pendingSwaps[ctx.from.id];
    }
  });

  bot.command('tokens', (ctx) => {
    ctx.reply(`🔖 Supported tokens:\n${Object.keys(TOKEN_MINTS).join(', ')}`);
  });

  bot.command('help', (ctx) => {
    ctx.reply(`🧾 Available Commands:
/start – Welcome message
/import – Add wallet
/wallets – View wallets
/deletewallets – Delete all wallets
/balance – Show SOL balance
/price <symbol> – Token price
/swap <FROM> <TO> <AMOUNT> – Swap tokens
/tokens – Show supported tokens
/help – Show this help`);
  });

  bot.on('text', async (ctx) => {
    const userId = ctx.from.id.toString();
    const text = ctx.message.text;

    if (!awaitingPrivateKey[ctx.from.id]) {
      ctx.reply('Use /import to add a wallet.');
      return;
    }

    try {
      const keypair = text.trim().startsWith('[')
        ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(text)))
        : Keypair.fromSecretKey(bs58.decode(text.trim()));

      await prisma.wallet.create({
        data: {
          userId,
          publicKey: keypair.publicKey.toBase58(),
          privateKey: encrypt(text),
        },
      });

      ctx.reply(`✅ Wallet saved.\n📟 Public Key: ${keypair.publicKey.toBase58()}`);
    } catch (err) {
      console.error('❌ Failed to import wallet:', err);
      ctx.reply('❌ Invalid private key format.');
    } finally {
      awaitingPrivateKey[ctx.from.id] = false;
    }
  });

  bot.catch((err) => {
    console.error('❌ Telegram bot error:', err);
  });

  try {
    await bot.launch();
    console.log('✅ Telegram bot is running!');
  } catch (err) {
    console.error('❌ Failed to launch bot:', err);
  }
}
