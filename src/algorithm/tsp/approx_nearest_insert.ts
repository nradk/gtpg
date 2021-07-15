import { Decorator, DecorationState } from "../../decoration/decorator";
import { EuclideanGraph } from "../../graph_core/euclidean_graph";
import { createGraphFromPath } from "../../graph_core/graph_util";
import { getNumStringForLabels } from "../../util";
import { VertexInput } from "../../commontypes";
import { TSPApprox } from "./tsp_approx";

export class TSPApproxNearestInsert extends TSPApprox {

    constructor(decorator: Decorator) {
        super(decorator);
    }

    protected initialize(input: VertexInput) {
        super.initialize(input);
        const graph = this.decorator.getGraph();
        for (const v of graph.getVertexIds()) {
            this.decorator.setVertexState(v, DecorationState.DISABLED);
        }
    }

    getFullName() {
        return "Nearest-Insert TSP Approximation Algorithm";
    }

    getShortName() {
        return "TSP-NI";
    }

    getDecorator(): Decorator {
        return this.decorator;
    }

    *run(input: VertexInput) {
        this.initialize(input);
        const graph = this.decorator.getGraph() as EuclideanGraph;
        const n = graph.getNumberOfVertices();
        const vertices = [...graph.getVertexIds()];
        const vertexIndices = new Map<number, number>();
        vertices.forEach((v, i) => vertexIndices.set(v, i));

        let start = this.startVertex;
        this.decorator.setVertexState(start, DecorationState.SELECTED);
        yield;
        const tour: number[] = [start];

        while (tour.length <= n) {
            const out = { nearest: 0 };
            yield* this.getNearestToPath(tour, graph, out);
            const nearest = out.nearest;
            if (nearest == null) {
                console.error("Nearest null before full tour found!");
                return;
            }
            // Insert nearest vertex to tour
            if (tour.length == 1) {
                tour.push(nearest);
                tour.push(tour[0]);
                this.decorator.setEdgeState(tour[0], nearest,
                    DecorationState.SELECTED);
                const w = graph.getEdgeWeight(tour[0], nearest);
                this.decorator.setEdgeLabel(tour[0], nearest,
                    getNumStringForLabels(w));
            } else {
                let insertAt = 0;
                let bestCost = Infinity;
                for (let i = 1; i < tour.length; i++) {
                    const cost = graph.getEdgeWeight(tour[i - 1], nearest) +
                        graph.getEdgeWeight(nearest, tour[i]) -
                        graph.getEdgeWeight(tour[i - 1], tour[i]);
                    if (cost < bestCost) {
                        insertAt = i;
                        bestCost = cost;
                    }
                }
                tour.splice(insertAt, 0, nearest);
                if (tour.length > 4)  {
                    this.decorator.setEdgeState(tour[insertAt - 1],
                        tour[insertAt + 1], DecorationState.DISABLED);
                }
                this.decorator.setEdgeState(tour[insertAt - 1], nearest,
                    DecorationState.SELECTED);
                this.decorator.setEdgeState(nearest, tour[insertAt + 1],
                    DecorationState.SELECTED);
                const w1 = graph.getEdgeWeight(tour[insertAt - 1], nearest);
                const w2 = graph.getEdgeWeight(tour[insertAt + 1], nearest);
                this.decorator.setEdgeLabel(tour[insertAt - 1], nearest,
                    getNumStringForLabels(w1));
                this.decorator.setEdgeLabel(tour[insertAt + 1], nearest,
                    getNumStringForLabels(w2));
            }
            this.decorator.setVertexState(nearest, DecorationState.SELECTED);
            yield;
        }
        return {
            graph: createGraphFromPath(tour, graph),
            name: "Approximate TSP Tour",
            message: null,
        };

    }

    private *getNearestToPath(path: number[], graph: EuclideanGraph,
            output: { nearest: number }) {
        let nearest = null;
        let minDist = Infinity;
        const pathSet = new Set(path);
        for (const p of pathSet) {
            const nn = graph.getNearestNeighbor(p, pathSet);
            this.decorator.setEdgeState(p, nn, DecorationState.CONSIDERING);
            this.decorator.setVertexState(nn, DecorationState.CONSIDERING);
            yield;
            this.decorator.setEdgeState(p, nn, DecorationState.DISABLED);
            this.decorator.setVertexState(nn, DecorationState.DISABLED);
            const dist = graph.getEdgeWeight(p, nn);
            if (dist < minDist) {
                minDist = dist;
                nearest = nn;
            }
        }
        output.nearest = nearest;
    }
}
