import assert from 'assert';
import { AllBalances, Balance, emptyBalance } from './balance';
import { AssetType, ExchangeName } from './base';

export class Trader {
  private initialBalances: AllBalances = {} as AllBalances;

  private initialBalanceSummary: Balance = {} as Balance;

  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private allBalances: AllBalances) {
    this.initialBalances = JSON.parse(JSON.stringify(allBalances)) as AllBalances;
    this.initialBalanceSummary = this.getBalanceSummary();
  }

  getBalance(exchangeName: ExchangeName, asset: AssetType) {
    return this.allBalances[exchangeName][asset];
  }

  trade(exchangeName: ExchangeName, from:AssetType, to:AssetType, price: number, volume: number) {
    this.allBalances[exchangeName][from] -= volume;
    this.allBalances[exchangeName][to] += volume * price;
    assert(this.allBalances[exchangeName][from] >= -1e-10, `Negative balance: ${JSON.stringify(this.allBalances)}`);
    assert(this.allBalances[exchangeName][to] >= -1e-10, `Negative balance: ${JSON.stringify(this.allBalances)}`);
    this.allBalances[exchangeName][from] = Math.max(0, this.allBalances[exchangeName][from]);
    this.allBalances[exchangeName][to] = Math.max(0, this.allBalances[exchangeName][to]);
  }

  getAllBalances(): AllBalances {
    return this.allBalances;
  }

  getBalanceSummary(): Balance {
    const balance = { ...emptyBalance };
    Object.keys(this.allBalances).forEach((k1) => {
      Object.keys(this.allBalances[k1 as ExchangeName]).forEach((k2) => {
        balance[k2 as AssetType] += this.allBalances[k1 as ExchangeName][k2 as AssetType];
      });
    });
    return balance;
  }

  getGains(): Balance {
    const gains = { ...emptyBalance };
    const currentSummary = this.getBalanceSummary();

    Object.keys(currentSummary).forEach((k) => {
      const asset = k as AssetType;
      gains[asset] = currentSummary[asset] - this.initialBalanceSummary[asset];
    });

    return gains;
  }
}
