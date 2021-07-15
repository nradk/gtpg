import { Algorithm, AlgorithmError, AlgorithmOutput } from "../algorithm";
import { Decorator, DecorationState } from "../../decoration/decorator";
import { Graph } from "../../graph_core/graph";
import { isSingleComponent } from "../../graph_core/graph_util";
import { combinationBits } from "../../util";
import { createGraphFromPath } from "../../graph_core/graph_util";

export class BHKHamiltonPath implements Algorithm<void> {

    private path: Graph;

    constructor(private decorator: Decorator) {
    }

    private initialize() {
        const graph = this.decorator.getGraph();
        if (graph.isDirected()) {
            throw new AlgorithmError("Bellman-Held-Karp algorithm only supports undirected graphs!");
        }
        if (!isSingleComponent(graph)) {
            throw new AlgorithmError("The graph contains more than one" +
                " component so it doesn't have a Hamilton path or a Hamilton circuit!");
        }
        if (graph.getNumberOfVertices() > 50) {
            throw new AlgorithmError("Graphs with more than 50 vertices are" +
                " not supported, in part because the algorithm has complexity O(n^2 * 2^n)");
        }

        this.path = null;

        for (const v of graph.getVertexIds()) {
            this.decorator.setVertexState(v, DecorationState.DISABLED);
        }
        for (const e of graph.getEdgeList()) {
            this.decorator.setEdgeState(e[0], e[1], DecorationState.DISABLED);
        }
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

    *run(): Generator<void, AlgorithmOutput, void> {
        this.initialize();
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
                this.setSelectionState(vertices, allVertices, DecorationState.DISABLED);
                this.setSelectionState(vertices, subset, DecorationState.CONSIDERING);
                // Loop through the set bits in the subset bitstring, which
                // correspond to the vertices in this vertex subset.
                let s = subset;
                let i = 0;
                while (s > 0) {
                    if ((s & 1) == 1) {
                        const v = vertices[i];
                        this.decorator.setVertexState(v, DecorationState.SELECTED);
                        yield;
                        // For each neighbor w of v, see if there is a Hamilton
                        // path of vertices in subset - {v} that ends in w
                        const subsetMinusV = subset & ~(1 << i);
                        for (const n of graph.getVertexNeighborIds(v)) {
                            const subsetMinusVVertices = this.getSubsetFromMask(vertices, subsetMinusV);
                            if (!subsetMinusVVertices.has(n)) {
                                continue;
                            }
                            this.decorator.setEdgeState(v, n, DecorationState.CONSIDERING);
                            yield;
                            this.decorator.setEdgeState(v, n, DecorationState.DISABLED);
                            if (prevSubsets.has(subsetMinusV)) {
                                if (prevSubsets.get(subsetMinusV).has(n)) {
                                    const path = prevSubsets.get(subsetMinusV).get(n);
                                    const newPath = path.concat([v]);
                                    if (!nextSubsets.has(subset)) {
                                        nextSubsets.set(subset, new Map<number, number[]>());
                                    }
                                    nextSubsets.get(subset).set(v, newPath);
                                    this.setPathEdgesState(newPath, DecorationState.SELECTED);
                                    yield;
                                    this.setPathEdgesState(newPath, DecorationState.DISABLED);
                                    break;
                                }
                            }
                        }
                        this.decorator.setVertexState(v, DecorationState.CONSIDERING);
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
                    this.path = createGraphFromPath(circuit, graph);
                    this.setSelectionState(vertices, allVertices, DecorationState.SELECTED);
                    this.setPathEdgesState(circuit, DecorationState.SELECTED);
                    return this.getOutput(true);
                } else {
                    hamiltonPath = path;
                }
            }
        }
        if (hamiltonPath != null) {
            this.path = createGraphFromPath(hamiltonPath, graph);
            this.setSelectionState(vertices, allVertices, DecorationState.SELECTED);
            this.setPathEdgesState(hamiltonPath, DecorationState.SELECTED);
            return this.getOutput(false);
        } else {
            return this.getOutput();
        }
    }

    private getOutput(isCircuit?: boolean) {
        const output: AlgorithmOutput = {
            graph: this.path,
            name: "Hamilton ",
            message: null
        };
        if (this.path != null) {
            output.name = output.name + (isCircuit ? "Circuit" : "Path");
            output.message = {
                level: "success",
                title: "Bellman-Held-Karp Algorithm",
                text: output.name + " Found!",
            };
        } else {
            output.message = {
                level: "failure",
                title: "Bellman-Held-Karp Algorithm",
                text: "No Hamilton Path or Circuit Found!",
            };
        }
        return output;
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
