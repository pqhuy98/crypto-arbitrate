import { Market } from 'ccxt';
import { AssetType, Exchange, ExchangeName } from '../exchanges/base';
import { Graph } from './graph';

const graph = new Graph();
export const stats = {
  updatedEdge: 0,
};

export function updateGraph(exchange: Exchange, symbol: string, bid?: [number, number], ask?: [number, number]) {
  const [p1, p2] = symbol.split('/') as AssetType[];
  const market = (exchange.client.market(symbol) as Market)!;
  const fees = market.taker!;
  // const fees = 0;

  if (bid) {
    graph.updateEdge(exchange.name, p1, p2, bid[0] * (1 - fees), bid[1]);
    stats.updatedEdge += 1;
  }

  if (ask) {
    graph.updateEdge(exchange.name, p2, p1, 1 / ask[0] * (1 - fees), ask[1]);
    stats.updatedEdge += 1;
  }
}

export function deleteEdge(exchangeName: ExchangeName, from: AssetType, to:AssetType) {
  graph.deleteEdge(exchangeName, from, to);
  graph.deleteEdge(exchangeName, to, from);
}

export function buildAdjacentList() {
  return graph.buildAdjacentList();
}

export function estimateUsdValue(asset: AssetType, unit: number) {
  const adj = graph.buildAdjacentList();
  if (['USDT', 'USDC'].includes(asset)) return unit;
  for (const e of adj[asset]) {
    if (['USDT', 'USDC'].includes(e.to)) {
      return e.price * unit;
    }
  }
  return undefined;
}

const logIntervalS = 60;
setInterval(() => {
  if (stats.updatedEdge > 0) {
    console.log(`Updated edges during last ${logIntervalS} secs:`, stats.updatedEdge);
  }
  stats.updatedEdge = 0;
}, logIntervalS * 1000);
