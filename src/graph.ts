interface GraphAdjacencies {
    [key: number]: number[];
};

class Graph {
    adjacencyList: GraphAdjacencies;

    constructor(adjacencyList?: GraphAdjacencies) {
        if (adjacencyList === undefined) {
            this.adjacencyList = {};
        } else {
            this.adjacencyList = adjacencyList;
        }
    }

    getVertexIds() {
        return Object.keys(this.adjacencyList).map(i => parseInt(i));
    }

    getVertexNeighborIds(vertexId: number) : undefined | number[] {
        return this.adjacencyList[vertexId];
    }
}

export default Graph;
