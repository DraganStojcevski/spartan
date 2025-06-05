import axios from 'axios';
import { Keypair, Connection } from '@solana/web3.js';

const JUPITER_QUOTE_URL = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_URL = 'https://quote-api.jup.ag/v6/swap';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

export const TOKEN_MINTS: Record<string, string> = {
    SOL: "So11111111111111111111111111111111111111112",
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMFrzaCERDEzMZvjZ7rYovRVuAdk9tJrB7CjL8jDD",
    BONK: "DezXzL3rAToQ7eHaD3ShwGz3DgLwefNh7KXQP5s2FvKp",
    OCTO: "4CoTCzobYt38zVbSieZxcmz2CCs8kmZJ6wnbj8HWocto",

    // add more as needed
  };
  
  export async function getJupiterQuote(
    fromSymbol: string,
    toSymbol: string,
    amount: number,
    userPublicKey: string
  ) {
    try {
      const inputMint = TOKEN_MINTS[fromSymbol.toUpperCase()];
      const outputMint = TOKEN_MINTS[toSymbol.toUpperCase()];
  
      if (!inputMint || !outputMint) {
        throw new Error("Unsupported token symbol");
      }
  
      const uiAmount = amount * 10 ** 9; // SOL has 9 decimals
  
      const { data } = await axios.get(JUPITER_QUOTE_URL, {
        params: {
          inputMint,
          outputMint,
          amount: uiAmount,
          slippageBps: 50,
          userPublicKey,
          swapMode: "ExactIn",
        },
      });
  
      return data.routes?.[0];
    } catch (err: any) {
      console.error("Quote error:", err?.response?.data || err.message);
      return null;
    }
  }
  

export async function executeJupiterSwap(
  quote: any,
  keypair: Keypair
): Promise<string> {
  const connection = new Connection(SOLANA_RPC);

  const { data } = await axios.post(JUPITER_SWAP_URL, {
    quoteResponse: quote,
    userPublicKey: keypair.publicKey.toBase58(),
  });

  const tx = Buffer.from(data.swapTransaction, 'base64');
  const txid = await connection.sendRawTransaction(tx);
  await connection.confirmTransaction(txid, 'confirmed');

  return txid;
}
