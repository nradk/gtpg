import { Algorithm, AlgorithmError, AlgorithmOutput } from "../algorithm";
import { Decorator } from "../../decoration/decorator";
import { Graph, WeightedGraph } from "../../graph_core/graph";
import { isSingleComponent } from "../../graph_core/graph_util";
import { DecorationState } from "../../decoration/decorator";

export class FleuryEulerTrail implements Algorithm<void> {

    private trail: WeightedGraph;
    private graph: Graph;
    private startVertex: number;
    private hasCycle: boolean;

    constructor(private decorator: Decorator) {
    }

    // The third value returned is the id of a vertex with odd degree, if one
    // exists. Otherwise, that value is -1.
    private getEvenAndOddDegreeCount(graph: Graph): [number, number, number] {
        let [even, odd, oddDegreeVertex] = [0, 0, -1];
        for (const v of graph.getVertexIds()) {
            const degree = graph.getVertexNeighborIds(v).size;
            if (degree % 2 == 0) {
                even += 1;
            } else {
                oddDegreeVertex = v;
                odd += 1;
            }
        }
        return [even, odd, oddDegreeVertex];
    }

    private isBridge(graph: Graph, edge: number[]): boolean {
        const sets: {[vertexId: number] : number} = {};
        const it = graph.getVertexIds().values();
        let v = it.next();
        let i = 0;
        while (!v.done) {
            sets[v.value] = i;
            i += 1;
            v = it.next();
        }
        const mergeValues = (a: number, b: number) => {
            const s = sets[b];
            for (const k of Object.keys(sets)) {
                if (sets[k] == s) {
                    sets[k] = sets[a];
                }
            }
        };
        for (const e of graph.getEdgeList()) {
            const [f, t] = e;
            if (!(f == edge[0] && t == edge[1]  || f == edge[1] && t == edge[0])) {
                mergeValues(f, t);
            }
        }
        const nComps = (new Set(Object.values(sets))).size;
        mergeValues(edge[0], edge[1]);
        return (new Set(Object.values(sets))).size < nComps;
    }

    private initialize() {
        const graph = this.decorator.getGraph();
        if (graph.isDirected() || graph.isWeighted()) {
            throw new AlgorithmError("Fleury's algorithm only supports undirected unweighted graphs!");
        }
        if (!isSingleComponent(graph)) {
            throw new AlgorithmError("The graph contains more than one"
                + " component so it doesn't have an Euler trail or an Euler cycle!");
        }
        this.graph = graph.clone();

        const [_, odd, oddVertex] = this.getEvenAndOddDegreeCount(graph);
        if (odd > 2) {
            throw new AlgorithmError(`The graph contains ${odd} odd-degree ` +
                "vertices so it doesn't have an Euler trail or an Euler cycle.");
        }
        if (odd == 2) {
            this.startVertex = oddVertex;
            this.hasCycle = false;
        } else {
            this.startVertex = graph.getVertexIds().values().next().value;
            this.hasCycle = true;
        }

        this.trail = new WeightedGraph(true);

        this.trail.addVertex(this.startVertex,
            this.graph.getVertexLabel(this.startVertex));

        for (const v of graph.getVertexIds()) {
            this.decorator.setVertexState(v, DecorationState.DISABLED);
        }
        for (const e of graph.getEdgeList()) {
            this.decorator.setEdgeState(e[0], e[1], DecorationState.DISABLED);
        }
    }

    getFullName() {
        return "Fleury's Euler Trail/Cycle Algorithm";
    }

    getShortName() {
        return "Fleury";
    }

    getDecorator(): Decorator {
        return this.decorator;
    }

    *run() {
        this.initialize();
        let currentVertex = this.startVertex;
        let stop = false;
        let edgeIndex = 1;
        while (!stop) {
            yield;
            this.decorator.setVertexState(currentVertex, DecorationState.SELECTED);
            stop = true;
            const neighbors = this.graph.getVertexNeighborIds(currentVertex);
            let i = 0;
            for (const n of neighbors) {
                this.decorator.setEdgeState(currentVertex, n, DecorationState.CONSIDERING);
                if (!this.isBridge(this.graph, [currentVertex, n]) || i == neighbors.size - 1) {
                    stop = false;
                    this.decorator.setEdgeState(currentVertex, n, DecorationState.SELECTED);
                    if (!this.trail.getVertexIds().has(n)) {
                        this.trail.addVertex(n, this.graph.getVertexLabel(n));
                    }
                    this.trail.addEdge(currentVertex, n, edgeIndex);
                    edgeIndex += 1;
                    this.graph.removeEdge(currentVertex, n);
                    currentVertex = n;
                    break;
                } else {
                    this.decorator.setEdgeState(currentVertex, n, DecorationState.DISABLED);
                }
                yield;
                i += 1;
            }
        }
        const name = "Euler " + (this.hasCycle ? "Cycle" : "Trail");
        return {
            graph: this.trail,
            name: name,
            message: {
                level: "success",
                title: "Fleury's Algorithm",
                text: name + " Found!"
            }
        } as AlgorithmOutput;
    }
}
