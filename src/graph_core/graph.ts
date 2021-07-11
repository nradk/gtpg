import { EuclideanGraph } from "./euclidean_graph";

type EmptyEdgeData = { };
interface WeightedEdgeData extends EmptyEdgeData { weight: number };
interface MultiEdgeData extends EmptyEdgeData { count: number };

type GraphAdjacencies<EdgeData extends EmptyEdgeData> = Map<number, Map<number, EdgeData>>;;
type UnweightedAdjacencies = GraphAdjacencies<EmptyEdgeData>;
type WeightedAdjacencies = GraphAdjacencies<WeightedEdgeData>;
type MultiAdjacencies = GraphAdjacencies<MultiEdgeData>;

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
    clone(): this;
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
    type AdjacencyTypes = UnweightedAdjacencies | WeightedAdjacencies | MultiAdjacencies;
    const obj: {adjacencies: AdjacencyTypes;
            vertexLabels: {[vertexId: number]: string},
            directed: boolean, weighted: boolean, multi: boolean } = jsonObject;
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
    const adjacencies: AdjacencyTypes = new Map();
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
    } else if (obj.multi) {
        return new MultiGraph(adjacencies as MultiAdjacencies, labels);
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
            multi: this instanceof MultiGraph,
        };
    }

    clone(): this {
        return fromJsonObject(this.toJSON()) as this;
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

    isWeighted() {
        return true;
    }
}

export class MultiGraph extends DefaultGraph<MultiEdgeData> {
    constructor(adjacencies?: GraphAdjacencies<MultiEdgeData>,
            vertexLabels?: Map<number, string>) {
        super(false, adjacencies, vertexLabels);
    }

    protected initialEdgeData(): MultiEdgeData {
        return { count: 1 };
    }

    getEdgeCount(startVertex: number, endVertex: number): number {
        if (!this.areNeighbors(startVertex, endVertex)) {
            return 0;
        }
        return this.adjacencies.get(startVertex).get(endVertex).count;
    }

    setEdgeCount(startVertex: number, endVertex: number, count: number) {
        if (!this.adjacencies.has(startVertex)) {
            throw Error(`Vertex ${startVertex} is not in the graph.`);
        }
        if (!this.adjacencies.has(endVertex)) {
            throw Error(`Vertex ${endVertex} is not in the graph.`);
        }
        if (count < 0) {
            throw Error(`Edge count cannot be a negative number!`);
        }
        if (!Number.isInteger(count)) {
            throw Error(`Edge count should be an integer!`);
        }
        if (this.doesEdgeExist(startVertex, endVertex)) {
            if (count == 0) {
                super.removeEdge(startVertex, endVertex);
            } else {
                this.adjacencies.get(startVertex).set(endVertex, { count: count });
                this.adjacencies.get(endVertex).set(startVertex, { count: count });
            }
        } else {
            super.addEdge(startVertex, endVertex);
            this.setEdgeCount(startVertex, endVertex, count);
        }
    }

    addEdge(startVertex: number, endVertex: number) {
        if (this.doesEdgeExist(startVertex, endVertex)) {
            // If the edge already exists, increment the count
            const count = this.adjacencies.get(startVertex).get(endVertex).count;
            this.adjacencies.get(startVertex).set(endVertex, { count: count + 1 });
        } else {
            super.addEdge(startVertex, endVertex);
        }
    }

    removeEdge(startVertex: number, endVertex: number): void {
        if (!this.doesEdgeExist(startVertex, endVertex)) {
            throw Error(`Edge ${startVertex},${endVertex} is not in the graph.`);
        }
        const count = this.adjacencies.get(startVertex).get(endVertex).count;
        if (count == 1) {
            super.removeEdge(startVertex, endVertex);
        } else {
            this.adjacencies.get(startVertex).set(endVertex, { count: count - 1 });
        }
    }

    getEdgeList(): number[][] {
        return super.getEdgeList().map(e => [...e, this.getEdgeCount(e[0], e[1])]);
    }

    isWeighted() {
        return false;
    }

    // Returns vertex neighbor ids taking multiplicity into account, i.e.
    // vertices are repeated if multiple edges exist.
    getVertexNeighborArray(vertex: number): number[] {
        const neighbors = this.getVertexNeighborIds(vertex);
        let array: number[] = [];
        for (const n of neighbors) {
            const count = this.getEdgeCount(vertex, n);
            const nArray = Array.from({ length: count }, _ => n);
            array = array.concat(nArray);
        }
        return array;
    }
}
