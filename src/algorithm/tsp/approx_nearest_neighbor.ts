import { Algorithm } from "../algorithm";
import { Decorator, DecorationState } from "../../decoration/decorator";
import { Graph } from "../../graph_core/graph";
import { EuclideanGraph } from "../../graph_core/euclidean_graph";
import { createOutputGraph } from "../../graph_core/graph_util";

export class TSPApproxNearestNeighbor implements Algorithm<void> {

    private path: Graph;

    constructor(private decorator: Decorator) {
    }

    initialize() {
        const graph = this.decorator.getGraph();
        if (!(graph instanceof EuclideanGraph)) {
            alert("Nearest neighbor TSP approximation algorithm only supports"
                + " Euclidean graphs!");
            throw new Error("TSP_APPROX_NN: Euclidean graph required!");
        }
        if (graph.getNumberOfVertices() < 2) {
            alert("Nearest neighbor TSP approximation algorithm requires at"
                + " least 2 vertices!");
            throw new Error("TSP_APPROX_NN: At least 2 vertices required!");
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
        return "Nearest-Neighbor TSP Approximation Algorithm";
    }

    getShortName() {
        return "TSP-NN";
    }

    getDecorator(): Decorator {
        return this.decorator;
    }

    *run(): IterableIterator<void> {
        const graph = this.decorator.getGraph() as EuclideanGraph;
        const n = graph.getNumberOfVertices();
        const vertices = [...graph.getVertexIds()];
        const vertexIndices = new Map<number, number>();
        vertices.forEach((v, i) => vertexIndices.set(v, i));

        // Pick a random starting vertex
        let current = vertices[Math.floor(Math.random() * vertices.length)];
        const tour: number[] = [current];

        while (tour.length < n) {
            this.decorator.setVertexState(current, DecorationState.SELECTED);
            yield;
            const nearest = graph.getNearestNeighbor(current, new Set(tour));
            if (nearest == null) {
                console.error("Nearest null before full tour found!");
                return;
            }
            this.decorator.setEdgeState(current, nearest, DecorationState.SELECTED);
            tour.push(nearest);
            current = nearest;
        }
        this.decorator.setVertexState(current, DecorationState.SELECTED);
        this.decorator.setEdgeState(tour[0], current, DecorationState.SELECTED);
        this.path = createOutputGraph(tour.concat(tour[0]), graph);
    }
}
