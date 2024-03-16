import { mkdir, writeFile } from 'fs/promises';
import { AssetType, assets } from '../exchanges/base';
import { Edge } from '../market-graph/graph';
import { buildAdjacentList, deleteEdge, estimateUsdValue } from '../market-graph/market-graph';
import { Trader } from '../exchanges/trader';
import { Balance } from '../exchanges/balance';

function findMaxSimpleCycleRecursion(trader: Trader) {
  const visited = new Set<string>();
  const path: Edge[] = [];

  let best = {
    path: [] as Edge[],
    init: 0,
    initUsd: 0 as number | undefined,
    gain: 0,
    gainUsd: 0,
    value: 1,
    ratio: 1,
  };

  const adj = buildAdjacentList();

  let cycleCount = 0;
  function dfs(from: AssetType, node: AssetType, currentValue: number) {
    if (node === from && path.length > 0) {
      cycleCount += 1;
      let ratio = 1;
      let want = trader.getBalance(path[0].exchangeName, path[0].from);
      for (const e of path) {
        const have = Math.min(trader.getBalance(e.exchangeName, e.from), e.volume);
        if (have < want) {
          ratio *= have / want;
          want = have;
        }
        want *= e.price;
      }
      const final = want;
      const init = trader.getBalance(path[0].exchangeName, path[0].from) * ratio;
      const gain = final - init;
      const gainUsd = estimateUsdValue(from, gain) ?? 1e-9;
      if (gainUsd > best.gainUsd) {
        best = {
          path: [...path],
          init,
          initUsd: estimateUsdValue(from, init),
          gain,
          gainUsd,
          ratio,
          value: currentValue,
        };
      }
      return;
    }
    for (const edge of adj[node]) {
      if (!visited.has(edge.to)) {
        path.push(edge);
        visited.add(edge.to);
        dfs(from, edge.to, currentValue * edge.price);
        path.pop();
        visited.delete(edge.to);
      }
    }
  }

  for (const from of assets) {
    if (!adj[from]) {
      continue;
    }

    dfs(from, from, 1);
  }
  return { ...best, cycleCount };
}

export type Cycle = NonNullable<ReturnType<typeof findMaxSimpleCycleRecursion>>

const baseBalance: Balance = {
  BTC: 0.002, ETH: 0.03, USDT: 100, USDC: 100, EUR: 100,
};

const trader = new Trader({
  binance: { ...baseBalance },
  coinbase: { ...baseBalance },
  kucoin: { ...baseBalance },
  bitfinex: { ...baseBalance },
});

const gainThreshold = 0.0000;

export function runMaxCycleStrategy() {
  startLogging();
  const cycle = findMaxSimpleCycleRecursion(trader);
  if (cycle && cycle.path.length > 0 && cycle.gainUsd >= gainThreshold) {
    const { path, ratio } = cycle;
    let units = trader.getBalance(path[0].exchangeName, path[0].from) * ratio;
    for (const e of cycle.path) {
      trader.trade(e.exchangeName, e.from, e.to, e.price, units);
      units *= e.price;
      deleteEdge(e.exchangeName, e.from, e.to);
    }

    console.clear();
    console.log('Found trade:', cycle);
    console.log('Gains:', trader.getGains());
    console.log('Balance summary:', trader.getBalanceSummary());
    console.log('Detailed balances:', trader.getAllBalances());

    for (const e of cycle.path) {
      deleteEdge(e.exchangeName, e.from, e.to);
    }
  }

  setTimeout(() => runMaxCycleStrategy(), 0);
}

let logInterval: ReturnType<typeof setTimeout> | null = null;
const logIntervalS = 5;
function startLogging() {
  if (!logInterval) {
    logInterval = setInterval(async () => {
      await mkdir('./output/max-cycle-strategy', { recursive: true });
      writeFile('./output/max-cycle-strategy/result.json', JSON.stringify(trader, null, 2));
    }, logIntervalS * 1000);
  }
}
