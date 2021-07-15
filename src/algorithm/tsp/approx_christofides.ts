import Blossom from "edmonds-blossom";

import { Decorator, DecorationState } from "../../decoration/decorator";
import { MultiGraph } from "../../graph_core/graph";
import { EuclideanGraph } from "../../graph_core/euclidean_graph";
import { createGraphFromPath } from "../../graph_core/graph_util";
import { AlgorithmError, Algorithm } from "../algorithm";
import { KruskalMST } from "../mst/kruskal";
import { MultiFleury } from "../walks/euler_multi";

export class TSPApproxChristofides implements Algorithm<void> {

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
        return "Christofides TSP Approximation Algorithm";
    }

    getShortName() {
        return "TSP-C";
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
        this.decorator.setStatusLine("Minimum Spanning Tree Found");
        yield;

        // Get the odd-degree vertices from the tree
        const oddDegree: number[] = [];
        for (const v of mst.getVertexIds()) {
            if (mst.getVertexNeighborIds(v).size % 2 == 1) {
                oddDegree.push(v);
            }
        }

        // Build the list of edges involving odd-degree vertices for passing to
        // the Blossom's algorithm
        const oddDegreeEdges: number[][] = [];
        for (let i = 0; i < oddDegree.length; i++) {
            for (let j = i + 1; j < oddDegree.length; j++) {
                const [v, w] = [oddDegree[i], oddDegree[j]];
                oddDegreeEdges.push([i, j, graph.getEdgeWeight(v, w)]);
            }
        }
        // "Negate" weight, because the library we use finds the maximum
        // matching instead of the minimum we need
        const maxWeight = Math.max(...oddDegreeEdges.map(e => e[2]));
        for (let i = 0; i < oddDegreeEdges.length; i++) {
            oddDegreeEdges[i][2] = maxWeight * 2 - oddDegreeEdges[i][2];
        }

        // Get the mininum weight matching
        this.decorator.setStatusLine("Finding minimum-weight matching between odd-degree vertices");
        yield;
        const matching = Blossom(oddDegreeEdges, true);

        // Translate the matchings to an edge pair format
        const minMatching: number[][] = [];
        const alreadyPut = new Set<number>();
        for (let i = 0; i < matching.length; i++) {
            if (alreadyPut.has(i)) {
                continue;
            }
            minMatching.push([oddDegree[i], oddDegree[matching[i]]]);
            this.decorator.setEdgeState(oddDegree[i], oddDegree[matching[i]],
                DecorationState.CONSIDERING);
            alreadyPut.add(matching[i]);
        }
        this.decorator.setStatusLine("Minimum-weight matching found");
        yield;

        // Merge the minimum spanning tree and the matchings into a Multigraph
        const multiGraph = new MultiGraph();
        for (const v of mst.getVertexIds()) {
            multiGraph.addVertex(v);
        }
        for (const e of mst.getEdgeList()) {
            multiGraph.addEdge(e[0], e[1]);
        }
        for (const e of minMatching) {
            multiGraph.addEdge(e[0], e[1]);
        }

        this.decorator.setStatusLine("Finding Euler Cycle");
        yield;
        // Get an Euler cycle on the Multigraph
        const algo = new MultiFleury();
        algo.initialize(multiGraph);
        const eulerCycle = algo.run();
        this.decorator.setStatusLine("Euler Cycle Found");
        yield;

        // Build a proper tour from the Euler Circut
        const skipTour: number[] = [eulerCycle[0]];
        const tourSet = new Set<number>(skipTour);
        this.decorator.setStatusLine("Creating TSP Tour");
        this.decorator.setVertexState(start, DecorationState.SELECTED);
        yield;
        for (const v of eulerCycle) {
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
        this.decorator.setPathState(eulerCycle, DecorationState.DISABLED, "edges-only");
        this.decorator.setPathState(skipTour, DecorationState.SELECTED, "both");
        this.decorator.setStatusLine("Approximate TSP Tour Found");
        yield;
        return {
            graph: createGraphFromPath(skipTour, graph),
            name: "Approximate TSP Tour",
            message: null,
        };
    }
}
