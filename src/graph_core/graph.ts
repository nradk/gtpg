interface GraphAdjacencies {
    [key: number]: number[];
};

interface WeightedGraphAdjacencies {
    [s: number]: {[e: number]: number};
};

export interface Graph {
    getVertexIds(): number[];
    getVertexNeighborIds(vertexId: number): number[];
    getEdgeList(): number[][];
    areNeighbors(startVertex: number, endVertex: number): boolean;
    getNumberOfVertices(): number;
    addVertex(vertexId?: number): number;
    removeVertex(vertexId: number): void;
    addEdge(startVertex: number, endVertex: number): void;
    removeEdge(startVertexId: number, endVertexId: number): void;
    doesEdgeExist(startVertexId: number, endVertexId: number): boolean;
    isDirected(): boolean;
    isWeighted(): boolean;
    toJSON(): object;
}

export function fromJsonString(jsonString: string): Graph {
    return fromJsonObject(JSON.parse(jsonString));
}

export function fromJsonObject(jsonObject: any): Graph {
    const obj: {adjacencies: (GraphAdjacencies | WeightedGraphAdjacencies),
            directed: boolean, weighted: boolean} = jsonObject;
    if (obj.weighted) {
        const adjacencies = obj.adjacencies as WeightedGraphAdjacencies;
        return new WeightedGraph(obj.directed, adjacencies);
    } else {
        const adjacencies = obj.adjacencies as GraphAdjacencies;
        return new UnweightedGraph(obj.directed, adjacencies);
    }
}


export class UnweightedGraph implements Graph {
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
        // TODO this will miss 0-outdegree vertices in directed graphs
        return Object.keys(this.adjacencyList).map(i => parseInt(i));
    }

    getVertexNeighborIds(vertexId: number): number[] {
        // TODO is this the correct thing to do for directed graphs?
        return this.adjacencyList[vertexId] ?? [];
    }

    getEdgeList(): number[][] {
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
    areNeighbors(startVertex: number, endVertex: number): boolean {
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

    addVertex(vertexId?: number): number {
        let newId: number;
        if (vertexId != undefined) {
            if (vertexId in this.adjacencyList) {
                throw Error(`Vertex ${vertexId} already exists in the graph.`);
            }
            newId = vertexId;
        } else {
            if (this.getVertexIds().length == 0) {
                newId = 1;
            } else {
                newId = Math.max(...this.getVertexIds().map(s => Number(s))) + 1;
            }
        }
        this.adjacencyList[newId] = [];
        return newId;
    }

    // Also removes edges
    removeVertex(vertexId: number) {
        if (!(vertexId in this.adjacencyList)) {
            throw Error(`Cannot remove missing vertex ${vertexId}.`);
        }
        for (const otherVertex of this.getVertexIds()) {
            // The check is necessary for directed graphs because in them there
            // might be an edge a -> b but no edge b -> a.
            if (this.areNeighbors(otherVertex, vertexId)) {
                this.removeEdge(otherVertex, vertexId);
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
        if (this.adjacencyList[startVertexId].includes(endVertexId)) {
            const index = this.adjacencyList[startVertexId].indexOf(
                endVertexId);
            this.adjacencyList[startVertexId].splice(index, 1);
        }
        if (!this.directed) {
            if (this.adjacencyList[endVertexId].includes(startVertexId)) {
                const index = this.adjacencyList[endVertexId].indexOf(
                    startVertexId);
                this.adjacencyList[endVertexId].splice(index, 1);
            }
        }
    }

    doesEdgeExist(startVertexId: number, endVertexId: number): boolean {
        return (startVertexId in this.adjacencyList) &&
            (this.adjacencyList[startVertexId].includes(endVertexId));
    }

    isDirected(): boolean {
        return this.directed;
    }

    isWeighted(): boolean {
        return false;
    }

    toJSON(): object {
        return {
            adjacencies: this.adjacencyList,
            directed: this.directed,
            weighted: false
        };
    }

    static completeGraph(numVertices: number): Graph {
        const adjList: GraphAdjacencies = {};
        for (let i = 1; i <= numVertices; i++) {
            adjList[i] = [];
            for (let j = 1; j <= numVertices; j++) {
                if (i != j) {
                    adjList[i].push(j);
                }
            }
        }
        return new UnweightedGraph(false, adjList);
    }
}

export class WeightedGraph implements Graph {
    adjacencyMap: WeightedGraphAdjacencies;
    readonly directed: boolean;

    constructor(directed: boolean, adjacencyMap?: WeightedGraphAdjacencies) {
        this.directed = directed;
        if (adjacencyMap === undefined) {
            this.adjacencyMap = {};
        } else {
            this.adjacencyMap = adjacencyMap;
        }
    }

    getVertexIds(): number[] {
        // TODO this will miss 0-outdegree vertices in directed graphs
        return Object.keys(this.adjacencyMap).map(i => parseInt(i));
    }

    getVertexNeighborIds(vertexId: number): number[] {
        // TODO is this the correct thing to do for directed graphs?
        return Object.keys(this.adjacencyMap[vertexId])?.map(v => parseInt(v));
    }

    // This returns an array of 3-element arrays where the third element is the weight
    getEdgeList(): number[][] {
        const edges = [];
        for (const v of this.getVertexIds()) {
            for (const n of this.getVertexNeighborIds(v)) {
                if (this.directed) {
                    edges.push([v, n, this.adjacencyMap[v][n]]);
                } else {
                    // In undirected graphs, we store edges in both directions.
                    // Return each edge only once.
                    if (n < v) {
                        edges.push([n, v, this.adjacencyMap[v][n]]);
                    }
                }
            }
        }
        return edges;
    }

    // This test is directed for directed graphs, i.e. in directed graphs
    // generally areNeighbors(x, y) !== areNeighbors(y, x)
    areNeighbors(startVertex: number, endVertex: number): boolean {
        if (!(startVertex in this.adjacencyMap)) {
            throw Error(`Vertex ${startVertex} is not in the graph.`);
        }
        if (!(endVertex in this.adjacencyMap)) {
            throw Error(`Vertex ${endVertex} is not in the graph.`);
        }
        // Directedness doesn't affect the following test because for
        // undirected graphs edges are stored in both directions.
        return endVertex in this.adjacencyMap[startVertex];
    }

    getEdgeWeight(startVertex: number, endVertex: number): number {
        if (!this.areNeighbors(startVertex, endVertex)) {
            throw Error(`There is no edge from ${startVertex} to ${endVertex}`);
        }
        return this.adjacencyMap[startVertex][endVertex];
    }

    setEdgeWeight(startVertex: number, endVertex: number, weight: number) {
        if (!(startVertex in this.adjacencyMap)) {
            throw Error(`Vertex ${startVertex} is not in the graph.`);
        }
        if (!(endVertex in this.adjacencyMap)) {
            throw Error(`Vertex ${endVertex} is not in the graph.`);
        }
        this.adjacencyMap[startVertex][endVertex] = weight;
        if (!this.directed) {
            this.adjacencyMap[endVertex][startVertex] = weight;
        }
    }

    getNumberOfVertices(): number {
        return this.getVertexIds().length;
    }


    addVertex(vertexId?: number): number {
        let newId: number;
        if (vertexId != undefined) {
            if (vertexId in this.adjacencyMap) {
                throw Error(`Vertex ${vertexId} already exists in the graph.`);
            }
            newId = vertexId;
        } else {
            if (this.getVertexIds().length == 0) {
                newId = 1;
            } else {
                newId = Math.max(...this.getVertexIds().map(s => Number(s))) + 1;
            }
        }
        this.adjacencyMap[newId] = {}
        return newId;
    }

    // Also removes edges
    removeVertex(vertexId: number) {
        if (!(vertexId in this.adjacencyMap)) {
            throw Error(`Cannot remove missing vertex ${vertexId}.`);
        }
        for (const otherVertex of this.getVertexIds()) {
            // The check is necessary for directed graphs because in them there
            // might be an edge a -> b but no edge b -> a.
            if (this.areNeighbors(otherVertex, vertexId)) {
                this.removeEdge(otherVertex, vertexId);
            }
        }
        delete this.adjacencyMap[vertexId];
    }

    // In an undirected graph, the edge is added in both directions
    // If weight is not passed, it is set to zero
    addEdge(startVertex: number, endVertex: number, weight?: number) {
        if (!(startVertex in this.adjacencyMap)) {
            throw Error(`Cannot add an edge because vertex ${startVertex} is` +
                ` not in the graph.`);
        }
        if (!(endVertex in this.adjacencyMap)) {
            throw Error(`Cannot add an edge because vertex ${endVertex} is` +
                `not in the graph.`);
        }
        // Don't allow loops now
        if (startVertex === endVertex) {
            throw Error("Cannot add a loop to a simple graph");
        }
        let w: number = 0;
        if (weight != undefined) {
            w = weight;
        }
        if (!(endVertex in this.adjacencyMap[startVertex])) {
            this.adjacencyMap[startVertex][endVertex] = w;
        }
        if (!this.directed) {
            if (!(startVertex in this.adjacencyMap[endVertex])) {
                this.adjacencyMap[endVertex][startVertex] = w;
            }
        }
    }

    removeEdge(startVertexId: number, endVertexId: number) {
        if (!(startVertexId in this.adjacencyMap)) {
            throw Error(`Cannot remove edge - no vertex ${startVertexId}.`);
        }
        if (!(endVertexId in this.adjacencyMap)) {
            throw Error(`Cannot remove edge - no vertex ${endVertexId}.`);
        }
        if (endVertexId in this.adjacencyMap[startVertexId]) {
            delete this.adjacencyMap[startVertexId][endVertexId];
        }
        if (!this.directed) {
            if (startVertexId in this.adjacencyMap[endVertexId]) {
                delete this.adjacencyMap[endVertexId][startVertexId];
            }
        }
    }

    doesEdgeExist(startVertexId: number, endVertexId: number): boolean {
        return (startVertexId in this.adjacencyMap) &&
            (endVertexId in this.adjacencyMap[startVertexId]);
    }

    isDirected(): boolean {
        return this.directed;
    }

    isWeighted(): boolean {
        return true;
    }

    toJSON(): object {
        return {
            adjacencies: this.adjacencyMap,
            directed: this.directed,
            weighted: true,
        };
    }

    static completeGraph(numVertices: number): Graph {
        const adjList: GraphAdjacencies = {};
        for (let i = 1; i <= numVertices; i++) {
            adjList[i] = [];
            for (let j = 1; j <= numVertices; j++) {
                if (i != j) {
                    adjList[i].push(j);
                }
            }
        }
        return new UnweightedGraph(false, adjList);
    }
}
