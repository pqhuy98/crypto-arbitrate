import dotenv from 'dotenv';
import ccxt, { Market } from 'ccxt';
import { mkdir, writeFile } from 'fs/promises';
import nodemailer from 'nodemailer';
import { Graph } from './graph';
import { getDiagnostics, submitDiagnostic } from './diagnostics';
import { attempt } from './rate-limiter';

dotenv.config();

const assets = ['BTC', 'ETH', 'USDT', 'USDC', 'EUR'];
const statusDurationS = 60;
const sendEmail = true;

const exchanges = [
  {
    name: 'binance',
    client: new ccxt.pro.binance({}),
    watchOrderBook: true,
    watchTicker: false,
  },
  {
    name: 'coinbasepro',
    client: new ccxt.pro.coinbasepro({
      apiKey: process.env.API_KEY_NAME_COINBASE,
      secret: process.env.API_KEY_SECRET_COINBASE,
    }),
    watchOrderBook: false,
    watchTicker: true,
    blacklistedSymbols: ['ETH/USDC', 'BTC/USDC'],
  },
  {
    name: 'kucoin',
    client: new ccxt.pro.kucoin({}),
    watchOrderBook: true,
    watchTicker: false,
  },
  {
    name: 'okx',
    client: new ccxt.pro.okx({}),
    watchOrderBook: true,
    watchTicker: false,
  },
  {
    name: 'bybit',
    client: new ccxt.pro.bybit({}),
    watchOrderBook: true,
    watchTicker: false,
  },
  {
    name: 'gateio',
    client: new ccxt.pro.gateio({}),
    watchOrderBook: true,
    watchTicker: false,
  },
  {
    name: 'bitfinex',
    client: new ccxt.pro.bitfinex({}),
    watchOrderBook: true,
    watchTicker: false,
  },
  {
    name: 'upbit',
    client: new ccxt.pro.upbit({}),
    watchOrderBook: true,
    watchTicker: false,
  },
  {
    name: 'kraken',
    client: new ccxt.pro.kraken({}),
    watchOrderBook: true,
    watchTicker: false,
  },
] satisfies {
  name: string
  client: unknown
  watchOrderBook: boolean
  watchTicker: boolean
  blacklistedSymbols?: string[]
}[];

type Exchange = typeof exchanges[number]

async function watchExchange(exchange: Exchange) {
  await exchange.client.loadMarkets(true);
  const symbols = Object.keys(exchange.client.markets)
    .filter((sym) => sym.split('/').every((p) => assets.includes(p)))
    .filter((sym) => !exchange.blacklistedSymbols?.includes(sym));

  for (const symbol of symbols) {
    const market = exchange.client.market(symbol) as Market;
    console.log(exchange.name, symbol, 'marker:', market!.maker, '- taker:', market!.taker);
  }

  const watchOrderBook = async (symbol: string) => {
    for (;;) {
      try {
        const orderBook = await exchange.client.watchOrderBook(symbol);
        if (symbol) {
          updateGraph(exchange, symbol, orderBook.bids.at(0)?.at(0), orderBook.asks.at(0)?.at(0));
          submitDiagnostic(`orderbook:${exchange.name}:${symbol}`, 'success');
        }
      } catch (e) {
        submitDiagnostic(`orderbook:${exchange.name}:${symbol}`, 'failure');
        console.error(e);
        await sleep(1000);
      }
    }
  };

  const watchTicker = async (symbol: string) => {
    for (;;) {
      try {
        const ticker = await exchange.client.watchTicker(symbol);
        updateGraph(exchange, symbol, ticker.bid, ticker.ask);
        submitDiagnostic(`ticker:${exchange.name}:${symbol}`, 'success');
      } catch (e) {
        submitDiagnostic(`ticker:${exchange.name}:${symbol}`, 'failure');
        console.error(e);
        await sleep(1000);
      }
    }
  };

  if (exchange.watchOrderBook) {
    symbols.forEach((sym) => watchOrderBook(sym));
  }
  if (exchange.watchTicker) {
    symbols.forEach((sym) => watchTicker(sym));
  }
}

const graph = new Graph();
let updatedEdge = 0;

function updateGraph(exchange: Exchange, symbol: string, bid?: number, ask?: number) {
  const [p1, p2] = symbol.split('/');
  const market = (exchange.client.market(symbol) as Market)!;
  const fees = market.taker!;

  if (bid) {
    graph.updateEdge(`${exchange.name}:${p1}-${p2}`, p1, p2, bid * (1 - fees));
    updatedEdge += 1;
  }

  if (ask) {
    graph.updateEdge(`${exchange.name}:${p2}-${p1}`, p2, p1, 1 / ask * (1 - fees));
    updatedEdge += 1;
  }
}

type Cycle = NonNullable<ReturnType<typeof graph.findMaxSimpleCycleRecursion>>

let data = {
  bestInvestment: 9999999,
  bestDate: new Date(),
  bestCycle: null as Cycle | null,

  currentDate: new Date(),
  currentCycle: null as Cycle | null,
};

function findMaxCycle(from: string) {
  const cycle = graph.findMaxSimpleCycleRecursion(from);
  if (cycle) {
    data = {
      ...data,
      currentDate: new Date(),
      currentCycle: cycle,
    };
    if (cycle.maxValue <= 1) {
      return;
    }

    const investment = 1 / (cycle.maxValue - 1);
    if (investment < data.bestInvestment) {
      data = {
        ...data,
        bestInvestment: investment,
        bestDate: new Date(),
        bestCycle: cycle,
      };
      onViableOpportunity(cycle, 'best');
    }
    if (investment < 100) {
      onViableOpportunity(cycle, 'viable');
    }
  }
}

function onViableOpportunity(cycle: Cycle, type: 'best' | 'viable') {
  if (!sendEmail || !attempt()) {
    return;
  }
  const investment = 1 / (cycle.maxValue - 1);
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_FROM_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  transporter.sendMail({
    from: process.env.GMAIL_FROM_EMAIL,
    to: process.env.GMAIL_TO_EMAIL,
    subject: `pqhuy.w - New ${type} arbitrate opportunity found: ${investment.toFixed(2)}`,
    text: JSON.stringify(cycle, null, 2),
  }, (err, info) => {
    if (err) {
      console.log('Failed to send email notification', { now: new Date(), err, info });
    } else {
      console.log('Sent email notification', { now: new Date() });
    }
  });
}

exchanges.forEach(watchExchange);

setInterval(() => {
  console.log(`Updated edges during last ${statusDurationS} secs:`, updatedEdge);
  updatedEdge = 0;
  (async () => {
    await mkdir('./output', { recursive: true });
    writeFile('./output/result.json', JSON.stringify(data, null, 2));
    writeFile('./output/diagnostics.json', JSON.stringify(getDiagnostics(), null, 2));
  })();
}, statusDurationS * 1000);

function loop() {
  findMaxCycle('BTC');
  setTimeout(loop, 0);
}
loop();

function sleep(ms: number) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}
