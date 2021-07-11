import { AlgorithmError } from "../algorithm";
import { MultiGraph } from "../../graph_core/graph";
import { isSingleComponent } from "../../graph_core/graph_util";

export class MultiFleury {

    private graph: MultiGraph;;
    private startVertex: number;

    // The third value returned is the id of a vertex with odd degree, if one
    // exists. Otherwise, that value is -1.
    private getEvenAndOddDegreeCount(graph: MultiGraph): [number, number, number] {
        let [even, odd, oddDegreeVertex] = [0, 0, -1];
        for (const v of graph.getVertexIds()) {
            const degree = graph.getVertexNeighborArray(v).length;
            if (degree % 2 == 0) {
                even += 1;
            } else {
                oddDegreeVertex = v;
                odd += 1;
            }
        }
        return [even, odd, oddDegreeVertex];
    }

    private isBridge(graph: MultiGraph, edge: number[]): boolean {
        // A multi-edge cannot be a bridge
        if (edge[2] > 1) {
            return false;
        }
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

    initialize(graph: MultiGraph) {
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
        } else {
            this.startVertex = graph.getVertexIds().values().next().value;
        }
    }

    run() {
        let currentVertex = this.startVertex;
        let stop = false;
        const trail: number[] = [currentVertex];
        while (!stop) {
            stop = true;
            const neighbors = this.graph.getVertexNeighborArray(currentVertex);
            let i = 0;
            for (const n of neighbors) {
                if (!this.isBridge(this.graph, [currentVertex, n]) || i == neighbors.length - 1) {
                    stop = false;
                    trail.push(n);
                    this.graph.removeEdge(currentVertex, n);
                    currentVertex = n;
                    break;
                } else {
                }
                i += 1;
            }
        }
        return trail;
    }
}
