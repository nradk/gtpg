import { EuclideanGraph } from "./euclidean_graph";

type EmptyEdgeData = { };
interface WeightedEdgeData extends EmptyEdgeData { weight: number };

type GraphAdjacencies<EdgeData extends EmptyEdgeData> = Map<number, Map<number, EdgeData>>;;
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
    isWeighted(): boolean;  // If isWeighted() == true for an implementation, it MUST
                            // implement the Weighted interface.
    toJSON(): object;
    clone(): Graph;
    populateLabelsFromIds(): void;
}

export interface Weighted {
    getEdgeWeight(startVertex: number, endVertex: number): number;
    setEdgeWeight(startVertex: number, endVertex: number, weight: number): void;
    addEdge(startVertex: number, endVertex: number, weight: number): void;
}

export function fromJsonString(jsonString: string): Graph {
    return fromJsonObject(JSON.parse(jsonString));
}

export function fromJsonObject(jsonObject: any): Graph {
    if ("isEuclidean" in jsonObject) {
        return EuclideanGraph.fromJsonObject(jsonObject);
    }
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
    const adjacencies: (WeightedAdjacencies | UnweightedAdjacencies) = new Map();
    for (const f in obj.adjacencies) {
        const fromV = parseInt(f);
        if (isNaN(fromV)) {
            throw new Error("Non-numeric key found in adjacencies object!");
        }
        adjacencies.set(fromV, new Map());
        for (const t in obj.adjacencies[f]) {
            const toV = parseInt(t);
            if (isNaN(toV)) {
                throw new Error("Non-numeric key found in adjacencies object!");
            }
            const edgeData = obj.adjacencies[f][t];
            if (obj.weighted && !('weight' in edgeData)) {
                // Just use a weight of 1 if weight was not found
                edgeData['weight'] = 1;
            }
            adjacencies.get(fromV).set(toV, edgeData);
        }
    }
    if (obj.weighted) {
        return new WeightedGraph(obj.directed,
            adjacencies as WeightedAdjacencies, labels);
    } else {
        return new UnweightedGraph(obj.directed,
            adjacencies as UnweightedAdjacencies, labels);
    }
}

abstract class DefaultGraph<EdgeData> implements Graph {
    protected adjacencies: GraphAdjacencies<EdgeData>;
    protected readonly directed: boolean;
    protected vertexLabels: Map<number, string>;

    constructor(directed: boolean, adjacencies?: GraphAdjacencies<EdgeData>,
        vertexLabels?: Map<number, string>) {
        this.directed = directed;
        this.adjacencies = adjacencies ?? new Map();
        this.vertexLabels = vertexLabels ?? new Map<number, string>();
    }

    getVertexIds(): Set<number> {
        // All vertices appear as a top-level key in the adjacencies object.
        return new Set(this.adjacencies.keys());
    }

    getVertexNeighborIds(vertexId: number, includeReverse?: boolean): Set<number> {
        if (!this.adjacencies.has(vertexId)) {
            throw Error(`Vertex ${vertexId} is not in the graph.`);
        }
        const neighbors = new Set(this.adjacencies.get(vertexId).keys());
        if (includeReverse) {
            for (const v of this.getVertexIds()) {
                if (this.adjacencies.get(v).has(vertexId)) {
                    neighbors.add(v);
                }
            }
        }
        return neighbors;
    }

    setVertexLabel(vertexId: number, label: string) {
        if (!this.adjacencies.has(vertexId)) {
            throw Error(`Vertex ${vertexId} is not in the graph.`);
        }
        this.vertexLabels.set(vertexId, label);
    }

    getVertexLabel(vertexId: number): string {
        if (!this.adjacencies.has(vertexId)) {
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
        if (!this.adjacencies.has(startVertex)) {
            throw Error(`Vertex ${startVertex} is not in the graph.`);
        }
        if (!this.adjacencies.has(endVertex)) {
            throw Error(`Vertex ${endVertex} is not in the graph.`);
        }
        // Directedness doesn't affect the following test because for
        // undirected graphs edges are stored in both directions.
        return this.adjacencies.get(startVertex).has(endVertex);
    }

    getNumberOfVertices(): number {
        return this.getVertexIds().size;
    }

    addVertex(vertexId?: number, label?: string): number {
        let newId: number;
        if (vertexId != undefined) {
            if (this.adjacencies.has(vertexId)) {
                throw Error(`Vertex ${vertexId} already exists in the graph.`);
            }
            newId = vertexId;
        } else if (this.getVertexIds().size == 0) {
            newId = 1;
        } else {
            newId = Math.max(...this.getVertexIds()) + 1;
        }
        this.adjacencies.set(newId, new Map<number, EdgeData>());
        if (label != undefined) {
            this.setVertexLabel(newId, label);
        }
        return newId;
    }

    // Also removes edges
    removeVertex(vertexId: number) {
        if (!this.adjacencies.has(vertexId)) {
            throw Error(`Cannot remove missing vertex ${vertexId}.`);
        }
        for (const otherVertex of this.getVertexIds()) {
            // The check is necessary for directed graphs because in them there
            // might be an edge a -> b but no edge b -> a.
            if (this.areNeighbors(otherVertex, vertexId)) {
                this.removeEdge(otherVertex, vertexId);
            }
        }
        this.adjacencies.delete(vertexId);
    }

    // In an undirected graph, the edge is added in both directions
    addEdge(startVertex: number, endVertex: number) {
        if (!this.adjacencies.has(startVertex)) {
            throw Error(`Cannot add an edge because vertex ${startVertex} is` +
                ` not in the graph.`);
        }
        if (!this.adjacencies.has(endVertex)) {
            throw Error(`Cannot add an edge because vertex ${endVertex} is` +
                `not in the graph.`);
        }
        // Don't allow loops now
        if (startVertex === endVertex) {
            throw Error("Cannot add a loop to a simple graph");
        }
        if (!this.adjacencies.get(startVertex).has(endVertex)) {
            this.adjacencies.get(startVertex).set(endVertex, this.initialEdgeData());
        }
        if (!this.directed) {
            if (!this.adjacencies.get(endVertex).has(startVertex)) {
                this.adjacencies.get(endVertex).set(startVertex, this.initialEdgeData());
            }
        }
    }

    protected abstract initialEdgeData(): EdgeData;

    removeEdge(startVertexId: number, endVertexId: number) {
        if (!this.adjacencies.has(startVertexId)) {
            throw Error(`Cannot remove edge - no vertex ${startVertexId}.`);
        }
        if (!this.adjacencies.has(endVertexId)) {
            throw Error(`Cannot remove edge - no vertex ${endVertexId}.`);
        }
        if (this.adjacencies.get(startVertexId).has(endVertexId)) {
            this.adjacencies.get(startVertexId).delete(endVertexId);
        }
        if (!this.directed) {
            if (this.adjacencies.get(endVertexId).has(startVertexId)) {
                this.adjacencies.get(endVertexId).delete(startVertexId);
            }
        }
    }

    doesEdgeExist(startVertexId: number, endVertexId: number): boolean {
        return this.adjacencies.has(startVertexId) &&
            this.adjacencies.get(startVertexId).has(endVertexId);
    }

    isDirected(): boolean {
        return this.directed;
    }

    toJSON(): object {
        const adjObject: {[f: string]: {[t: string]: EdgeData}} = {};
        for (const [k, v] of this.adjacencies) {
            adjObject[k] = Object.fromEntries(v);
        }
        return {
            adjacencies: adjObject,
            vertexLabels: Object.fromEntries(this.vertexLabels),
            directed: this.isDirected(),
            weighted: this.isWeighted(),
        };
    }

    clone(): Graph {
        return fromJsonObject(this.toJSON());
    }

    populateLabelsFromIds() {
        for (const v of this.getVertexIds()) {
            this.vertexLabels.set(v, v.toString());
        }
    }

    abstract isWeighted(): boolean;
}

export class UnweightedGraph extends DefaultGraph<EmptyEdgeData> {
    protected initialEdgeData(): EmptyEdgeData {
        return {};
    }

    static completeGraph(numVertices: number): Graph {
        const adjs: UnweightedAdjacencies = new Map();
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

    isWeighted() {
        return false;
    }
}

export class WeightedGraph extends DefaultGraph<WeightedEdgeData> implements Weighted {
    protected initialEdgeData(): WeightedEdgeData {
        return { weight: 1 };
    }

    getEdgeWeight(startVertex: number, endVertex: number): number {
        if (!this.areNeighbors(startVertex, endVertex)) {
            throw Error(`There is no edge from ${startVertex} to ${endVertex}`);
        }
        return this.adjacencies.get(startVertex).get(endVertex).weight;
    }

    setEdgeWeight(startVertex: number, endVertex: number, weight: number) {
        if (!this.adjacencies.has(startVertex)) {
            throw Error(`Vertex ${startVertex} is not in the graph.`);
        }
        if (!this.adjacencies.has(endVertex)) {
            throw Error(`Vertex ${endVertex} is not in the graph.`);
        }
        this.adjacencies.get(startVertex).set(endVertex, { weight: weight });
        if (!this.directed) {
            this.adjacencies.get(endVertex).set(startVertex, { weight: weight });
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
        const adjs: WeightedAdjacencies = new Map();
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

    isWeighted() {
        return true;
    }
}
