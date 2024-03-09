import dotenv from 'dotenv';
import ccxt, { Market, Ticker, Tickers } from 'ccxt';

dotenv.config();

const exchanges = [
  {
    name: 'Binance',
    client: new ccxt.pro.binance({}),
    symbols: ['BTC/USDT', 'BTC/EUR', 'EUR/USDT'],
  },
  {
    name: 'CoinbasePro',
    client: new ccxt.pro.coinbasepro({
      apiKey: process.env.API_KEY_NAME_COINBASE,
      secret: process.env.API_KEY_SECRET_COINBASE,
    }),
    symbols: ['BTC/USDT', 'BTC/EUR', 'USDT/EUR'],
  },
  {
    name: 'Kucoin',
    client: new ccxt.pro.kucoin({}),
    symbols: ['BTC/USDT', 'BTC/EUR', 'USDT/EUR'],
  },
];

type Exchange = typeof exchanges[number]

const tickerCache: Record<string, Ticker> = {};

async function watchExchange(exchange: Exchange) {
  await exchange.client.loadMarkets(true);
  for (const symbol of exchange.symbols) {
    const market = exchange.client.market(symbol) as Market;
    console.log(exchange.name, symbol, market!.maker, market!.taker);
  }

  for (;;) {
    const tickers = await exchange.client.watchTickers(exchange.symbols);
    Object.values(tickers)
      .forEach((ticker) => {
        const [c1, c2] = ticker.symbol.split('/');
        if (c1 > c2) {
          // flip ticker
          const keys: (keyof Ticker)[] = [
            'high', 'low', 'bid', 'bidVolume', 'open', 'close', 'last', 'previousClose', 'average', 'percentage',
          ];
          keys.forEach((k: keyof Ticker) => {
            if (ticker[k]) {
              ticker[k] = 1 / ticker[k];
            }
          });
        }
        tickerCache[`${exchange.name}:${ticker.symbol}`] = ticker;
      });
    onData(exchange, tickers);
  }
}

let maxRatio = 0;
let maxE1 = '';
let maxE2 = '';
let maxE3 = '';

// tickerCache['CoinbasePro:BTC/EUR'] = { last: 48500 } as Ticker;
// tickerCache['CoinbasePro:BTC/USDT'] = { last: 59068 } as Ticker;
// tickerCache['CoinbasePro:EUR/USDT'] = { last: 1 / 0.75674 } as Ticker;
// tickerCache['Binance:BTC/USDT'] = { last: 59112 } as Ticker;
// tickerCache['Binance:EUR/USDT'] = { last: 1.12 } as Ticker;
// tickerCache['Binance:BTC/EUR'] = { last: 52920 } as Ticker;

function onData(exchange: Exchange, tickers: Tickers) {
}

function loop() {
  const exchangeNames = exchanges.map((e) => e.name);
  for (const e1 of exchangeNames) {
    for (const e2 of exchangeNames) {
      for (const e3 of exchangeNames) {
        const t1 = `${e1}:BTC/USDT`;
        const t2 = `${e2}:EUR/USDT`;
        const t3 = `${e3}:BTC/EUR`;

        const btcusdt = tickerCache[t1]?.last;
        const eurusdt = tickerCache[t2]?.last;
        const btceur = tickerCache[t3]?.last;

        if (btcusdt && eurusdt && btceur) {
          const ratio = btcusdt / eurusdt / btceur;
          if (maxRatio < ratio) {
            maxRatio = ratio;
            maxE1 = t1;
            maxE2 = t2;
            maxE3 = t3;
          }
        }
      }
    }
  }

  console.log({
    maxRatio, maxE1, maxE2, maxE3,
  });
}

exchanges.forEach(watchExchange);
// setInterval(loop, 1000);
