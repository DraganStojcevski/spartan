import axios from 'axios';

const API_KEY = process.env.CMC_API_KEY!;
const BASE_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';

export async function getPrice(symbol: string) {
  try {
    const res = await axios.get(BASE_URL, {
      params: {
        symbol: symbol.toUpperCase(),
        convert: 'USD',
      },
      headers: {
        'X-CMC_PRO_API_KEY': API_KEY,
      },
    });

    const data = res.data.data[symbol.toUpperCase()];
    const price = data.quote.USD.price.toFixed(6);
    const change = data.quote.USD.percent_change_24h.toFixed(2);
    const marketCap = data.quote.USD.market_cap.toLocaleString();

    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      marketCap,
    };
  }  catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('CMC Error:', err.response?.data || err.message);
    } else {
      console.error('Unknown error:', err);
    }
    return null;
}}