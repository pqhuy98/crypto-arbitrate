import { AssetType, ExchangeName } from './base';

export type Balance = Record<AssetType, number>

export const emptyBalance = {
  BTC: 0, ETH: 0, USDT: 0, USDC: 0, EUR: 0,
};

export type AllBalances = Record<ExchangeName, Balance>
export const emptyAllBalances: AllBalances = {
  binance: { ...emptyBalance },
  coinbase: { ...emptyBalance },
  kucoin: { ...emptyBalance },
  bitfinex: { ...emptyBalance },
};
