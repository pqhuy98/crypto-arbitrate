interface Edge {
  edgeId: string
  from: string
  to: string
  value: number
}

type AdjacentList = Record<string, Edge[]>

export class Graph {
  private edges: Record<string, Edge> = {};

  private adj: AdjacentList | null;

  getEdges() {
    return Object.keys(this.edges).map((k) => this.edges[k]);
  }

  updateEdge(edgeId: string, from: string, to: string, value: number) {
    this.edges[edgeId] = {
      edgeId,
      from,
      to,
      value,
    };
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

  findMaxSimpleCycleRecursion(from: string) {
    const visited = new Set<string>();
    const path: Edge[] = [];

    let maxPath: Edge[] = [];
    let maxValue: number = 0;

    const adj = this.buildAdjacentList();

    if (!adj[from]) {
      return null;
    }

    let cycleCount = 0;

    function dfs(node: string, currentValue: number) {
      if (node === from && path.length > 0) {
        cycleCount += 1;
        if (currentValue > maxValue) {
          maxValue = currentValue;
          maxPath = [...path];
        }
      }
      for (const edge of adj[node]) {
        if (!visited.has(edge.to)) {
          path.push(edge);
          visited.add(edge.to);
          dfs(edge.to, currentValue * edge.value);
          path.pop();
          visited.delete(edge.to);
        }
      }
    }

    dfs(from, 1);

    return { maxValue, maxPath, cycleCount };
  }
}
