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

    getEdgeList() {
        // Assume undirected now
        const edges = [];
        for (const v of this.getVertexIds()) {
            for (const n of this.getVertexNeighborIds(v)) {
                if (n < v) {
                    edges.push([n, v]);
                }
            }
        }
        return edges;
    }

    getNumberOfVertices(): number {
        return this.getVertexIds().length;
    }

    addVertex(): number {
        const newId = Math.max(...this.getVertexIds().map(s => Number(s))) + 1;
        this.adjacencyList[newId] = [];
        return newId;
    }

    // Also removes edges
    removeVertex(vertexId: number) {
        if (!(vertexId in this.adjacencyList)) {
            throw Error(`Cannot remove missing vertex ${vertexId}.`);
        }
        const neighbors = this.adjacencyList[vertexId].slice();
        for (const neighbor of neighbors) {
            this.removeEdge(vertexId, neighbor);
        }
        delete this.adjacencyList[vertexId];
    }

    addEdge(startVertex: number, endVertex: number) {
        // Assume undirected
        if (!(startVertex in this.adjacencyList)) {
            throw Error(`Cannot add an edge because vertex ${startVertex} is` +
                ` not in the graph.`);
        }
        if (!(endVertex in this.adjacencyList)) {
            throw Error(`Cannot add an edge because vertex ${endVertex} is` +
                `not in the graph.`);
        }
        // Don't allow loops now
        if (startVertex === endVertex) {
            throw Error("Cannot add a loop to a simple graph");
        }
        if (!(endVertex in this.adjacencyList[startVertex])) {
            this.adjacencyList[startVertex].push(endVertex);
        }
        if (!(startVertex in this.adjacencyList[endVertex])) {
            this.adjacencyList[endVertex].push(startVertex);
        }
    }

    removeEdge(startVertex: number, endVertex: number) {
        if (endVertex in this.adjacencyList[startVertex]) {
            const index = this.adjacencyList[startVertex].indexOf(endVertex);
            this.adjacencyList[startVertex].splice(index, 1);
        }
        if (startVertex in this.adjacencyList[endVertex]) {
            const index = this.adjacencyList[endVertex].indexOf(startVertex);
            this.adjacencyList[endVertex].splice(index, 1);
        }
    }
}

export default Graph;
