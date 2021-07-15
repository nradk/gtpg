import { Decorator, DecorationState } from "../../decoration/decorator";
import { EuclideanGraph } from "../../graph_core/euclidean_graph";
import { createGraphFromPath } from "../../graph_core/graph_util";
import { AlgorithmError, Algorithm } from "../algorithm";
import { KruskalMST } from "../mst/kruskal";

export class TSPApproxMSTBased implements Algorithm<void> {

    constructor(private decorator: Decorator) {
    }

    private initialize() {
        const graph = this.decorator.getGraph();
        if (!(graph instanceof EuclideanGraph)) {
            throw new AlgorithmError("Only Euclidean graphs are supported!");
        }
        if (graph.getNumberOfVertices() < 2) {
            throw new AlgorithmError("At least 2 vertices are required!");
        }
        for (const v of graph.getVertexIds()) {
            this.decorator.setVertexState(v, DecorationState.DISABLED);
        }
    }

    getFullName() {
        return "MST Based TSP Approximation Algorithm";
    }

    getShortName() {
        return "TSP-MST";
    }

    getDecorator(): Decorator {
        return this.decorator;
    }

    *run() {
        this.initialize();
        const graph = this.decorator.getGraph() as EuclideanGraph;
        const kruskal = new KruskalMST(this.decorator);
        this.decorator.setStatusLine("Finding Minimum Spanning Tree with Kruskal's Algorithm");
        yield;
        const mstOut = yield* kruskal.run();
        const mst = mstOut.graph;
        // Start with an arbitrary leaf vertex
        let start = mst.getVertexIds().values().next().value;
        for (const v of mst.getVertexIds()) {
            if (mst.getVertexNeighborIds(v).size == 1) {
                start = v;
                break;
            }
        }
        for (const v of mst.getVertexIds()) {
            this.decorator.setVertexState(v, DecorationState.CONSIDERING);
        }
        for (const e of mst.getEdgeList()) {
            this.decorator.setEdgeState(e[0], e[1], DecorationState.CONSIDERING);
        }
        yield;
        // Build a tour from the minimum spanning tree
        const visited = new Set<number>();
        const treeTour: number[] = [];
        const traverse = (vertex: number) => {
            visited.add(vertex);
            treeTour.push(vertex);
            for (const n of mst.getVertexNeighborIds(vertex)) {
                if (visited.has(n)) {
                    continue;
                }
                traverse(n);
                treeTour.push(vertex);
            }
        }
        traverse(start);
        const skipTour: number[] = [start];
        const tourSet = new Set<number>(skipTour);
        this.decorator.setVertexState(start, DecorationState.SELECTED);
        yield;
        for (const v of treeTour) {
            const last = skipTour[skipTour.length - 1];
            if (!tourSet.has(v)) {
                tourSet.add(v);
                skipTour.push(v);
                this.decorator.setEdgeState(last, v, DecorationState.SELECTED);
                this.decorator.setVertexState(v, DecorationState.SELECTED);
                yield;
            }
        }
        // Join the extremeties to make it a tour
        skipTour.push(skipTour[0]);
        this.decorator.setPathState(treeTour, DecorationState.DISABLED, "edges-only");
        this.decorator.setPathState(skipTour, DecorationState.SELECTED, "both");
        yield;
        console.log(skipTour);
        return {
            graph: createGraphFromPath(skipTour, graph),
            name: "Approximate TSP Tour",
            message: null,
        };
    }
}
