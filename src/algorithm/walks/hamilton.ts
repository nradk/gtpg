import { Algorithm } from "../algorithm";
import { Decorator, DecorationState } from "../../decoration/decorator";
import { Graph, UnweightedGraph } from "../../graph_core/graph";
import { isSingleComponent } from "../../graph_core/graph_util";
import { combinationBits } from "../../util";

export class BHKHamiltonPath implements Algorithm<void> {

    private path: Graph;

    constructor(private decorator: Decorator) {
    }

    initialize() {
        const graph = this.decorator.getGraph();
        if (graph.isDirected()) {
            alert("Bellman-Held-Karp algorithm only supports undirected graphs!");
            throw new Error("BHK: undirected graph required!");
        }
        if (!isSingleComponent(graph)) {
            alert("The graph contains more than one component so it doesn't" +
                " have a Hamilton path or a Hamilton circuit!");
            throw new Error("BHK: More than 1 component!");
        }
        if (graph.getNumberOfVertices() > 50) {
            alert("Graphs with more than 50 vertices are not supported, in "
                + "part because the algorithm has complexity O(n^2 * 2^n)");
            throw new Error("BHK: Graph too large!");
        }

        this.path = null;

        for (const v of graph.getVertexIds()) {
            this.decorator.setVertexState(v, "disabled");
        }
        for (const e of graph.getEdgeList()) {
            this.decorator.setEdgeState(e[0], e[1], "disabled");
        }
    }

    getOutputGraph() {
        return this.path;
    }

    getFullName() {
        return "Bellman-Held-Karp Hamilton Path Algorithm";
    }

    getShortName() {
        return "BHK Hamilton";
    }

    getDecorator(): Decorator {
        return this.decorator;
    }

    *run(): IterableIterator<void> {
        const graph = this.decorator.getGraph();
        const n = graph.getNumberOfVertices();
        const vertices = [...graph.getVertexIds()];
        const vertexIndices = new Map<number, number>();
        vertices.forEach((v, i) => vertexIndices.set(v, i));
        const one_subsets = combinationBits(n, 1);
        let prevSubsets = new Map<number, Map<number, number[]>>();
        for (const i of one_subsets) {
            prevSubsets.set(i, new Map<number, number[]>());
            const endVertex = vertices[Math.log2(i)];
            prevSubsets.get(i).set(endVertex, [endVertex]);
        }
        const allVertices = (1 << n) - 1;
        console.log(prevSubsets);
        for (let k = 2; k <= n; k++) {
            const k_subsets = combinationBits(n, k);
            const nextSubsets = new Map<number, Map<number, number[]>>();
            for (const subset of k_subsets) {
                this.setSelectionState(vertices, allVertices, "disabled");
                this.setSelectionState(vertices, subset, "considering");
                // Loop through the set bits in the subset bitstring, which
                // correspond to the vertices in this vertex subset.
                let s = subset;
                let i = 0;
                while (s > 0) {
                    if ((s & 1) == 1) {
                        const v = vertices[i];
                        this.decorator.setVertexState(v, "selected");
                        yield;
                        // For each neighbor w of v, see if there is a Hamilton
                        // path of vertices in subset - {v} that ends in w
                        const subsetMinusV = subset & ~(1 << i);
                        for (const n of graph.getVertexNeighborIds(v)) {
                            const subsetMinusVVertices = this.getSubsetFromMask(vertices, subsetMinusV);
                            if (!subsetMinusVVertices.has(n)) {
                                continue;
                            }
                            this.decorator.setEdgeState(v, n, "considering");
                            yield;
                            this.decorator.setEdgeState(v, n, "disabled");
                            if (prevSubsets.has(subsetMinusV)) {
                                if (prevSubsets.get(subsetMinusV).has(n)) {
                                    const path = prevSubsets.get(subsetMinusV).get(n);
                                    const newPath = path.concat([v]);
                                    if (!nextSubsets.has(subset)) {
                                        nextSubsets.set(subset, new Map<number, number[]>());
                                    }
                                    nextSubsets.get(subset).set(v, newPath);
                                    this.setPathEdgesState(newPath, "selected");
                                    yield;
                                    this.setPathEdgesState(newPath, "disabled");
                                    break;
                                }
                            }
                        }
                        this.decorator.setVertexState(v, "considering");
                    }
                    s = s >> 1;
                    i++;
                }
            }
            console.log(nextSubsets);
            prevSubsets = nextSubsets;
        }
        let hamiltonPath: number[] = null;
        if (prevSubsets.has(allVertices)) {
            for (const endV of prevSubsets.get(allVertices).keys()) {
                const path = prevSubsets.get(allVertices).get(endV);
                if (graph.areNeighbors(endV, path[0])) {
                    // Then there is a hamilton circuit!
                    const circuit = path.concat(path[0]);
                    this.path = this.createOutputGraph(circuit);
                    this.setPathEdgesState(circuit, "selected");
                    return;
                } else {
                    hamiltonPath = path;
                }
            }
        }
        if (hamiltonPath != null) {
            this.path = this.createOutputGraph(hamiltonPath);
            this.setPathEdgesState(hamiltonPath, "selected");
        }
    }

    private createOutputGraph(path: number[]): Graph {
        const outGraph = new UnweightedGraph(true);
        const graph = this.decorator.getGraph();
        outGraph.addVertex(path[0], graph.getVertexLabel(path[0]));
        for (let i = 1; i < path.length; i++) {
            // The following 'if' guard is necessary for paths that are
            // circuits, because the last vertex will be the same as the first
            // vertex.
            if (!outGraph.getVertexIds().has(path[i])) {
                outGraph.addVertex(path[i], graph.getVertexLabel(path[i]));
            }
            outGraph.addEdge(path[i - 1], path[i]);
        }
        return outGraph;
    }

    private setSelectionState(vertices: number[], subset: number,
            state: DecorationState) {
        for (const v of this.getSubsetFromMask(vertices, subset)) {
            this.decorator.setVertexState(v, state);
        }
    }

    private setPathEdgesState(path: number[], state: DecorationState) {
        for (let i = 1; i < path.length; i++) {
            this.decorator.setEdgeState(path[i - 1], path[i], state);
        }
    }

    private getSubsetFromMask(vertices: number[], subsetMask: number): Set<number> {
        let s = subsetMask, i = 0;
        const subset = new Set<number>();
        while (s > 0) {
            if ((s & 1) == 1) {
                subset.add(vertices[i]);
            }
            s = s >> 1;
            i++;
        }
        return subset;
    }
}
