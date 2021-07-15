import { Decorator, DecorationState } from "../../decoration/decorator";
import { Graph } from "../../graph_core/graph";
import { EuclideanGraph } from "../../graph_core/euclidean_graph";
import { createGraphFromPath } from "../../graph_core/graph_util";
import { getNumStringForLabels } from "../../util";
import { VertexInput } from "../../commontypes";
import { TSPApprox } from "./tsp_approx";
import { AlgorithmOutput} from "../algorithm";

export class TSPApproxNearestNeighbor extends TSPApprox {

    private path: Graph;

    constructor(decorator: Decorator) {
        super(decorator);
    }

    protected initialize(input: VertexInput) {
        super.initialize(input);
        const graph = this.decorator.getGraph();
        this.path = null;
        for (const v of graph.getVertexIds()) {
            this.decorator.setVertexState(v, DecorationState.DISABLED);
        }
    }

    getFullName() {
        return "Nearest-Neighbor TSP Approximation Algorithm";
    }

    getShortName() {
        return "TSP-NN";
    }

    getDecorator(): Decorator {
        return this.decorator;
    }

    *run(input: VertexInput): Generator<void, AlgorithmOutput, void> {
        this.initialize(input);
        const graph = this.decorator.getGraph() as EuclideanGraph;
        const n = graph.getNumberOfVertices();
        const vertices = [...graph.getVertexIds()];
        const vertexIndices = new Map<number, number>();
        vertices.forEach((v, i) => vertexIndices.set(v, i));

        let current = this.startVertex;
        const tour: number[] = [current];

        while (tour.length < n) {
            this.decorator.setVertexState(current, DecorationState.SELECTED);
            yield;
            const exclude = new Set(tour);
            yield* this.considerAllNeighbors(graph, current, exclude);
            const nearest = graph.getNearestNeighbor(current, exclude);
            if (nearest == null) {
                console.error("Nearest null before full tour found!");
                return;
            }
            this.decorator.setEdgeState(current, nearest, DecorationState.SELECTED);
            const w = graph.getEdgeWeight(current, nearest);
            this.decorator.setEdgeLabel(current, nearest, getNumStringForLabels(w));
            yield;
            tour.push(nearest);
            current = nearest;
        }
        this.decorator.setVertexState(current, DecorationState.SELECTED);
        this.decorator.setEdgeState(tour[0], current, DecorationState.SELECTED);
        const w = graph.getEdgeWeight(tour[0], current);
        this.decorator.setEdgeLabel(tour[0], current, getNumStringForLabels(w));
        this.path = createGraphFromPath(tour.concat(tour[0]), graph);
        return {
            graph: this.path,
            name: "Approximate TSP Tour",
            message: null,
        };
    }

    *considerAllNeighbors(graph: EuclideanGraph, vertexId: number,
            exclude?: Set<number>) {
        exclude = exclude ?? new Set<number>();
        for (const n of graph.getVertexNeighborIds(vertexId)) {
            if (exclude.has(n)) {
                continue;
            }
            this.decorator.setEdgeState(vertexId, n, DecorationState.CONSIDERING);
            this.decorator.setVertexState(n, DecorationState.CONSIDERING);
            const w = graph.getEdgeWeight(vertexId, n);
            this.decorator.setEdgeLabel(vertexId, n, getNumStringForLabels(w));
            yield;
            this.decorator.clearEdgeLabel(vertexId, n);
            this.decorator.setEdgeState(vertexId, n, DecorationState.DISABLED);
            this.decorator.setVertexState(n, DecorationState.DISABLED);
        }
    }
}
