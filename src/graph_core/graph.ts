type EmptyEdgeData = { };
interface WeightedEdgeData extends EmptyEdgeData { weight: number };

interface GraphAdjacencies<EdgeData extends EmptyEdgeData> {
    [key: number]: {[to_key: number]: EdgeData }
};
type UnweightedAdjacencies = GraphAdjacencies<EmptyEdgeData>;
type WeightedAdjacencies = GraphAdjacencies<WeightedEdgeData>;

export interface Graph {
    getVertexIds(): Set<number>;
    getVertexNeighborIds(vertexId: number, includeReverse?: boolean): Set<number>;
    setVertexLabel(vertexId: number, label: string): void;
    getVertexLabel(vertexId: number): string;
    getAllVertexLabels(): Map<number, string>;
    getEdgeList(): number[][];
    areNeighbors(startVertex: number, endVertex: number): boolean;
    getNumberOfVertices(): number;
    addVertex(vertexId?: number, label?: string): number;
    removeVertex(vertexId: number): void;
    addEdge(startVertex: number, endVertex: number): void;
    removeEdge(startVertexId: number, endVertexId: number): void;
    doesEdgeExist(startVertexId: number, endVertexId: number): boolean;
    isDirected(): boolean;
    toJSON(): object;
}

export function fromJsonString(jsonString: string): Graph {
    return fromJsonObject(JSON.parse(jsonString));
}

export function fromJsonObject(jsonObject: any): Graph {
    const obj: {adjacencies: (UnweightedAdjacencies | WeightedAdjacencies);
            vertexLabels: {[vertexId: number]: string},
            directed: boolean, weighted: boolean} = jsonObject;
    let labels:  Map<number, string>;
    if (obj.vertexLabels) {
        const entries = Object.entries(obj.vertexLabels);
        labels = new Map(entries.map(([key, value]) => [parseInt(key), value]));
    } else {
        // If no labels present, create labels from vertex ids.
        labels = new Map<number, string>();
        Object.entries(obj.adjacencies).forEach(([key, _]) => {
            labels.set(parseInt(key), key);
        });
    }
    if (obj.weighted) {
        const adjacencies = obj.adjacencies as WeightedAdjacencies;
        return new WeightedGraph(obj.directed, adjacencies, labels);
    } else {
        const adjacencies = obj.adjacencies as UnweightedAdjacencies;
        return new UnweightedGraph(obj.directed, adjacencies, labels);
    }
}

abstract class DefaultGraph<EdgeData> implements Graph {
    protected adjacencies: GraphAdjacencies<EdgeData>;
    protected readonly directed: boolean;
    protected vertexLabels: Map<number, string>;

    constructor(directed: boolean, adjacencies?: GraphAdjacencies<EdgeData>,
            vertexLabels?: Map<number, string>) {
        this.directed = directed;
        this.adjacencies = adjacencies ?? {};
        this.vertexLabels = vertexLabels ?? new Map<number, string>();
    }

    getVertexIds(): Set<number> {
        // All vertices appear as a top-level key in the adjacencies object.
        return DefaultGraph.keysAsNumberSet(this.adjacencies);
    }

    private static keysAsNumberSet(obj: {[key: number]: any}): Set<number> {
        return new Set(Object.keys(obj).map(i => parseInt(i)));
    }

    getVertexNeighborIds(vertexId: number, includeReverse?: boolean): Set<number> {
        const neighbors = DefaultGraph.keysAsNumberSet(this.adjacencies[vertexId] ?? {});
        if (includeReverse) {
            for (const v of this.getVertexIds()) {
                if (vertexId in this.adjacencies[v]) {
                    neighbors.add(v);
                }
            }
        }
        return neighbors;
    }

    setVertexLabel(vertexId: number, label: string) {
        if (!(vertexId in this.adjacencies)) {
            throw Error(`Vertex ${vertexId} is not in the graph.`);
        }
        this.vertexLabels.set(vertexId, label);
    }

    getVertexLabel(vertexId: number): string {
        if (!(vertexId in this.adjacencies)) {
            throw Error(`Vertex ${vertexId} is not in the graph.`);
        }
        return this.vertexLabels.get(vertexId);
    }

    getAllVertexLabels(): Map<number, string> {
        return this.vertexLabels;
    }

    getEdgeList(): number[][] {
        const edges = [];
        for (const v of this.getVertexIds()) {
            for (const n of this.getVertexNeighborIds(v)) {
                if (this.isDirected()) {
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
        if (!(startVertex in this.adjacencies)) {
            throw Error(`Vertex ${startVertex} is not in the graph.`);
        }
        if (!(endVertex in this.adjacencies)) {
            throw Error(`Vertex ${endVertex} is not in the graph.`);
        }
        // Directedness doesn't affect the following test because for
        // undirected graphs edges are stored in both directions.
        return endVertex in this.adjacencies[startVertex];
    }

    getNumberOfVertices(): number {
        return this.getVertexIds().size;
    }

    addVertex(vertexId?: number, label?: string): number {
        let newId: number;
        if (vertexId != undefined) {
            if (vertexId in this.adjacencies) {
                throw Error(`Vertex ${vertexId} already exists in the graph.`);
            }
            newId = vertexId;
        }
        if (this.getVertexIds().size == 0) {
            newId = 1;
        } else {
            newId = Math.max(...this.getVertexIds()) + 1;
        }
        this.adjacencies[newId] = {};
        if (label != undefined) {
            this.setVertexLabel(newId, label);
        }
        return newId;
    }

    // Also removes edges
    removeVertex(vertexId: number) {
        if (!(vertexId in this.adjacencies)) {
            throw Error(`Cannot remove missing vertex ${vertexId}.`);
        }
        for (const otherVertex of this.getVertexIds()) {
            // The check is necessary for directed graphs because in them there
            // might be an edge a -> b but no edge b -> a.
            if (this.areNeighbors(otherVertex, vertexId)) {
                this.removeEdge(otherVertex, vertexId);
            }
        }
        delete this.adjacencies[vertexId];
    }

    // In an undirected graph, the edge is added in both directions
    addEdge(startVertex: number, endVertex: number) {
        if (!(startVertex in this.adjacencies)) {
            throw Error(`Cannot add an edge because vertex ${startVertex} is` +
                ` not in the graph.`);
        }
        if (!(endVertex in this.adjacencies)) {
            throw Error(`Cannot add an edge because vertex ${endVertex} is` +
                `not in the graph.`);
        }
        // Don't allow loops now
        if (startVertex === endVertex) {
            throw Error("Cannot add a loop to a simple graph");
        }
        if (!(endVertex in this.adjacencies[startVertex])) {
            this.adjacencies[startVertex][endVertex] = this.initialEdgeData();
        }
        if (!this.directed) {
            if (!(startVertex in this.adjacencies[endVertex])) {
                this.adjacencies[endVertex][startVertex] = this.initialEdgeData();
            }
        }
    }

    protected abstract initialEdgeData(): EdgeData;

    removeEdge(startVertexId: number, endVertexId: number) {
        if (!(startVertexId in this.adjacencies)) {
            throw Error(`Cannot remove edge - no vertex ${startVertexId}.`);
        }
        if (!(endVertexId in this.adjacencies)) {
            throw Error(`Cannot remove edge - no vertex ${endVertexId}.`);
        }
        if (endVertexId in this.adjacencies[startVertexId]) {
            delete this.adjacencies[startVertexId][endVertexId];
        }
        if (!this.directed) {
            if (startVertexId in this.adjacencies[endVertexId]) {
                delete this.adjacencies[endVertexId][startVertexId];
            }
        }
    }

    doesEdgeExist(startVertexId: number, endVertexId: number): boolean {
        return (startVertexId in this.adjacencies) && (endVertexId in
            this.adjacencies[startVertexId]);
    }

    isDirected(): boolean {
        return this.directed;
    }

    toJSON(): object {
        return {
            adjacencies: this.adjacencies,
            vertexLabels: Object.fromEntries(this.vertexLabels),
            directed: this.directed,
            weighted: this instanceof WeightedGraph
        };
    }
}

export class UnweightedGraph extends DefaultGraph<EmptyEdgeData> {
    protected initialEdgeData(): EmptyEdgeData {
        return {};
    }

    static completeGraph(numVertices: number): Graph {
        const adjs: UnweightedAdjacencies = {};
        for (let i = 1; i <= numVertices; i++) {
            adjs[i] = [];
            for (let j = 1; j <= numVertices; j++) {
                if (i != j) {
                    adjs[i][j] = {};
                }
            }
        }
        return new UnweightedGraph(false, adjs);
    }
}

export class WeightedGraph extends DefaultGraph<WeightedEdgeData> {
    protected initialEdgeData(): WeightedEdgeData {
        return { weight: 1 };
    }

    getEdgeWeight(startVertex: number, endVertex: number): number {
        if (!this.areNeighbors(startVertex, endVertex)) {
            throw Error(`There is no edge from ${startVertex} to ${endVertex}`);
        }
        return this.adjacencies[startVertex][endVertex].weight;
    }

    setEdgeWeight(startVertex: number, endVertex: number, weight: number) {
        if (!(startVertex in this.adjacencies)) {
            throw Error(`Vertex ${startVertex} is not in the graph.`);
        }
        if (!(endVertex in this.adjacencies)) {
            throw Error(`Vertex ${endVertex} is not in the graph.`);
        }
        this.adjacencies[startVertex][endVertex] = { weight: weight };
        if (!this.directed) {
            this.adjacencies[endVertex][startVertex] = { weight: weight };
        }
    }

    // In an undirected graph, the edge is added in both directions
    // If weight is not passed, it is set to 1
    addEdge(startVertex: number, endVertex: number, weight?: number) {
        super.addEdge(startVertex, endVertex);
        if (weight != undefined) {
            this.setEdgeWeight(startVertex, endVertex, weight);
        }
    }

    getEdgeList(): number[][] {
        return super.getEdgeList().map(e => [...e, this.getEdgeWeight(e[0], e[1])]);
    }

    static completeGraph(numVertices: number): Graph {
        const adjs: WeightedAdjacencies = {};
        for (let i = 1; i <= numVertices; i++) {
            adjs[i] = {};
            for (let j = 1; j <= numVertices; j++) {
                if (i != j) {
                    adjs[i][j] = {weight:1};
                }
            }
        }
        return new WeightedGraph(false, adjs);
    }
}
