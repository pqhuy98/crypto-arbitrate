import { AssetType, ExchangeName } from '../exchanges/base';

export interface Edge {
  exchangeName: ExchangeName
  from: AssetType
  to: AssetType
  price: number
  volume: number
}

type AdjacentList = Record<string, Edge[]>

export class Graph {
  private edges: Record<string, Edge> = {};

  private adj: AdjacentList | null;

  getEdges() {
    return Object.keys(this.edges).map((k) => this.edges[k]);
  }

  updateEdge(exchangeName: ExchangeName, from: AssetType, to: AssetType, price: number, volume: number) {
    this.edges[`${exchangeName}:${from}-${to}`] = {
      exchangeName,
      from,
      to,
      price,
      volume,
    };
    this.adj = null;
  }

  deleteEdge(exchangeName: ExchangeName, from: AssetType, to: AssetType) {
    delete this.edges[`${exchangeName}:${from}-${to}`];
    this.adj = null;
  }

  buildAdjacentList(): AdjacentList {
    if (!this.adj) {
      const res: AdjacentList = {};
      Object.keys(this.edges).forEach((edgeId) => {
        const edge = this.edges[edgeId];
        if (!res[edge.from]) res[edge.from] = [];
        if (!res[edge.from]) res[edge.from] = [];
        res[edge.from].push(edge);
      });
      this.adj = res;
    }
    return this.adj;
  }
}
