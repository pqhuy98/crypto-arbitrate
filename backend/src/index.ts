import { watchAllExchanges } from './exchanges/base';
import { updateGraph } from './market-graph/market-graph';
import { runMaxCycleStrategy } from './strategies/max-cycle';

watchAllExchanges({
  onOrderBook(exchange, symbol, orderBook) {
    updateGraph(exchange, symbol, orderBook.bids.at(0) as [number, number], orderBook.asks.at(0) as [number, number]);
  },
});

runMaxCycleStrategy();
