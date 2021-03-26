interface GraphAdjacencies {
    [key: number]: number[];
};

class Graph {
    adjacencyList: GraphAdjacencies;
    readonly directed: boolean;

    constructor(directed: boolean, adjacencyList?: GraphAdjacencies) {
        this.directed = directed;
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
        const edges = [];
        for (const v of this.getVertexIds()) {
            for (const n of this.getVertexNeighborIds(v)) {
                if (this.directed) {
                    edges.push([v, n]);
                } else {
                    // In undirected graphs, we store edges in both directions.
                    // Return each edge only once.
                    if (n < v) {
                        edges.push([n, v]);
                    }
                }
            }
        }
        return edges;
    }

    // This test is directed for directed graphs, i.e. in directed graphs
    // generally areNeighbors(x, y) !== areNeighbors(y, x)
    areNeighbors(startVertex: number, endVertex: number) {
        if (!(startVertex in this.adjacencyList)) {
            throw Error(`Vertex ${startVertex} is not in the graph.`);
        }
        if (!(endVertex in this.adjacencyList)) {
            throw Error(`Vertex ${endVertex} is not in the graph.`);
        }
        // Directedness doesn't affect the following test because for
        // undirected graphs edges are stored in both directions.
        return this.adjacencyList[startVertex].includes(endVertex);
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
            // The check is necessary for directed graphs because in them there
            // might be an edge a -> b but no edge b -> a.
            if (this.areNeighbors(neighbor, vertexId)) {
                this.removeEdge(neighbor, vertexId);
            }
        }
        delete this.adjacencyList[vertexId];
    }

    // In an undirected graph, the edge is added in both directions
    addEdge(startVertex: number, endVertex: number) {
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
        if (!this.directed) {
            if (!(startVertex in this.adjacencyList[endVertex])) {
                this.adjacencyList[endVertex].push(startVertex);
            }
        }
    }

    removeEdge(startVertexId: number, endVertexId: number) {
        if (!(startVertexId in this.adjacencyList)) {
            throw Error(`Cannot remove edge - no vertex ${startVertexId}.`);
        }
        if (!(endVertexId in this.adjacencyList)) {
            throw Error(`Cannot remove edge - no vertex ${endVertexId}.`);
        }
        if (endVertexId in this.adjacencyList[startVertexId]) {
            const index = this.adjacencyList[startVertexId].indexOf(
                endVertexId);
            this.adjacencyList[startVertexId].splice(index, 1);
        }
        if (!this.directed) {
            if (startVertexId in this.adjacencyList[endVertexId]) {
                const index = this.adjacencyList[endVertexId].indexOf(
                    startVertexId);
                this.adjacencyList[endVertexId].splice(index, 1);
            }
        }
    }

    isDirected(): boolean {
        return this.directed;
    }

    toJsonString(): string {
        return JSON.stringify({
            adjacencyList: this.adjacencyList,
            directed: this.directed
        });
    }

    static fromJsonString(jsonString: string): Graph {
        const obj: {adjacencyList: GraphAdjacencies, directed: boolean}
                = JSON.parse(jsonString);
        return new Graph(obj.directed, obj.adjacencyList);
    }
}

export default Graph;
