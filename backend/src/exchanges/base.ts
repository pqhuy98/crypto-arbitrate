import ccxt, { Market, OrderBook } from 'ccxt';
import dotenv from 'dotenv';
import { sleep } from '../lib/utils';
import { submitDiagnostic } from './diagnostics';

dotenv.config();

export const assets = ['BTC', 'ETH', 'USDT', 'USDC', 'EUR'] as const;
export type AssetType = typeof assets[number];
export type ExchangeName = 'binance'|'coinbase'|'kucoin'|'bitfinex'

const exchanges = [
  {
    name: 'binance',
    client: new ccxt.pro.binance({}),
    excludedSymbols: [],
  },
  {
    name: 'coinbase',
    client: new ccxt.pro.coinbase({
      apiKey: process.env.API_KEY_NAME_COINBASE,
      secret: process.env.API_KEY_SECRET_COINBASE,
    }),
    excludedSymbols: ['ETH/USDC', 'BTC/USDC'],
  },
  {
    name: 'kucoin',
    client: new ccxt.pro.kucoin({}),
    excludedSymbols: [],
  },
  {
    name: 'bitfinex',
    client: new ccxt.pro.bitfinex({}),
    excludedSymbols: [],
  },
] satisfies {
  name: ExchangeName
  client: unknown
  excludedSymbols: string[]
}[];

export type Exchange = typeof exchanges[number]

async function watchExchange(
  exchange: Exchange,
  onOrderBook: (ex: Exchange, symbol: string, orderBook: OrderBook)=> void,
  onError?: (ex: Exchange, symbol: string, error: unknown)=> void,
) {
  await exchange.client.loadMarkets(true);
  const symbols = Object.keys(exchange.client.markets)
    .filter((sym) => sym.split('/').every((p) => assets.includes(p as AssetType)))
    .filter((sym) => !((exchange.excludedSymbols as string[]).includes(sym)));

  for (const symbol of symbols) {
    const market = exchange.client.market(symbol) as Market;
    console.log(exchange.name, symbol, 'marker:', market!.maker, '- taker:', market!.taker);
  }

  const watchOrderBook = async (symbol: string) => {
    for (;;) {
      try {
        const orderBook = await exchange.client.watchOrderBook(symbol);
        if (symbol) {
          onOrderBook(exchange, symbol, orderBook);
          submitDiagnostic(`orderbook:${exchange.name}:${symbol}`, 'success');
        }
      } catch (e) {
        submitDiagnostic(`orderbook:${exchange.name}:${symbol}`, 'failure');
        if (onError) onError(exchange, symbol, e);
        await sleep(1000);
      }
    }
  };
  symbols.forEach((sym) => watchOrderBook(sym));
}

export function watchAllExchanges({ onOrderBook, onError }: {
  onOrderBook: (ex: Exchange, symbol: string, orderBook: OrderBook)=> void
  onError?: (ex: Exchange, symbol: string, error: unknown)=> void
}) {
  exchanges.forEach((e) => watchExchange(e, onOrderBook, onError));
}
