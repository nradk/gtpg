import { Algorithm, AlgorithmError } from "../algorithm";
import { Decorator, DecorationState } from "../../decoration/decorator";
import { Graph } from "../../graph_core/graph";
import { EuclideanGraph } from "../../graph_core/euclidean_graph";
import { combinationBits } from "../../util";
import { createGraphFromPath } from "../../graph_core/graph_util";

export class BHK_TSP implements Algorithm<void> {

    private path: Graph;

    constructor(private decorator: Decorator) {
    }

    private initialize() {
        const graph = this.decorator.getGraph();
        if (!(graph instanceof EuclideanGraph)) {
            throw new AlgorithmError("Bellman-Held-Karp TSP algorithm only Euclidean graphs!");
        }
        if (graph.getNumberOfVertices() > 50) {
            throw new AlgorithmError("Graphs with more than 50 vertices are " +
                "not supported, in part because the algorithm has complexity O(n^2 * 2^n)");
        }

        this.path = null;

        for (const v of graph.getVertexIds()) {
            this.decorator.setVertexState(v, DecorationState.DISABLED);
        }
    }

    getOutputGraph() {
        return this.path;
    }

    getFullName() {
        return "Bellman-Held-Karp Traveling Salesman Algorithm";
    }

    getShortName() {
        return "BHK TSP";
    }

    getDecorator(): Decorator {
        return this.decorator;
    }

    *run() {
        this.initialize();
        type Path = { steps: number[], cost: number };
        const graph = this.decorator.getGraph() as EuclideanGraph;
        const n = graph.getNumberOfVertices();
        const vertices = [...graph.getVertexIds()];
        const vertexIndices = new Map<number, number>();
        vertices.forEach((v, i) => vertexIndices.set(v, i));
        const one_subsets = combinationBits(n, 1);
        let prevSubsets = new Map<number, Map<number, Path>>();
        for (const i of one_subsets) {
            prevSubsets.set(i, new Map<number, Path>());
            const endVertex = vertices[Math.log2(i)];
            prevSubsets.get(i).set(endVertex, { steps: [endVertex], cost: 0 });
        }
        const allVertices = (1 << n) - 1;
        for (let k = 2; k <= n; k++) {
            const k_subsets = combinationBits(n, k);
            const nextSubsets = new Map<number, Map<number, Path>>();
            for (const subset of k_subsets) {
                this.setSelectionState(vertices, allVertices, DecorationState.DISABLED);
                this.setSelectionState(vertices, subset, DecorationState.CONSIDERING);
                // Loop through the set bits in the subset bitstring, which
                // correspond to the vertices in this vertex subset.
                let s = subset << 1;
                let i = -1;
                while (s > 0) {
                    i++;
                    s = s >> 1;
                    if ((s & 1) == 0) {
                        continue;
                    }
                    const v = vertices[i];
                    this.decorator.setVertexState(v, DecorationState.SELECTED);
                    yield;
                    // For each neighbor w of v, see if there is a Hamilton
                    // path of vertices in subset - {v} that ends in w
                    const subsetMinusV = subset & ~(1 << i);
                    const subsetMinusVVertices = this.getSubsetFromMask(vertices, subsetMinusV);
                    for (const n of graph.getVertexNeighborIds(v)) {
                        if (!subsetMinusVVertices.has(n)) {
                            continue;
                        }
                        this.decorator.setEdgeState(v, n, DecorationState.CONSIDERING);
                        yield;
                        this.decorator.setEdgeState(v, n, DecorationState.DISABLED);
                        if (prevSubsets.has(subsetMinusV)) {
                            if (prevSubsets.get(subsetMinusV).has(n)) {
                                const path = prevSubsets.get(subsetMinusV).get(n);
                                const newPathSteps = path.steps.concat([v]);
                                const newCost = path.cost + graph.getEdgeWeight(n, v);
                                if (!nextSubsets.has(subset)) {
                                    nextSubsets.set(subset, new Map<number, Path>());
                                    nextSubsets.get(subset).set(v, { steps: newPathSteps, cost: newCost });
                                } else {
                                    if (nextSubsets.get(subset).has(v)) {
                                        const oldPath = nextSubsets.get(subset).get(v);
                                        if (newCost < oldPath.cost) {
                                            nextSubsets.get(subset).set(v, { steps: newPathSteps, cost: newCost });
                                        }
                                    } else {
                                        nextSubsets.get(subset).set(v, { steps: newPathSteps, cost: newCost });
                                    }
                                }
                                this.setPathEdgesState(newPathSteps, DecorationState.SELECTED);
                                yield;
                                this.setPathEdgesState(newPathSteps, DecorationState.DISABLED);
                            }
                        }
                    }
                    this.decorator.setVertexState(v, DecorationState.CONSIDERING);
                }
            }
            prevSubsets = nextSubsets;
        }
        let bestTour: number[] = null;
        let bestCost: number = Infinity;
        for (const endV of prevSubsets.get(allVertices).keys()) {
            const path = prevSubsets.get(allVertices).get(endV);
            const tour = path.steps.concat(path.steps[0]);
            const cost = path.cost + graph.getEdgeWeight(path.steps[0], endV);
            if (cost < bestCost) {
                bestTour = tour;
                bestCost = cost;
            }
        }
        this.path = createGraphFromPath(bestTour, graph);
        this.setSelectionState(vertices, allVertices, DecorationState.SELECTED);
        this.setPathEdgesState(bestTour, DecorationState.SELECTED);
        return {
            graph: this.path,
            name: "TSP Tour",
            message: null,
        }
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
