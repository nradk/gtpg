import { Algorithm } from "../algorithm";
import { Decorator, DecorationState } from "../../decoration/decorator";
import { Graph } from "../../graph_core/graph";
import { EuclideanGraph } from "../../graph_core/euclidean_graph";
import { createOutputGraph } from "../../graph_core/graph_util";

type Tour = { tour: number[], cost: number };

export class TSPApproxCheapestInsert implements Algorithm<void> {

    private path: Graph;

    constructor(private decorator: Decorator) {
    }

    initialize() {
        const graph = this.decorator.getGraph();
        if (!(graph instanceof EuclideanGraph)) {
            alert("Cheapest insert TSP approximation algorithm only supports"
                + " Euclidean graphs!");
            throw new Error("TSP_APPROX_NN: Euclidean graph required!");
        }
        if (graph.getNumberOfVertices() < 2) {
            alert("Cheapest insert TSP approximation algorithm requires at"
                + " least 2 vertices!");
            throw new Error("TSP_APPROX_NN: At least 2 vertices required!");
        }
        this.path = null;
        this.decorator.clearAllDecoration();
    }

    getOutputGraph() {
        return this.path;
    }

    getFullName() {
        return "Cheapest-Insert TSP Approximation Algorithm";
    }

    getShortName() {
        return "TSP-NI";
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
        let start = vertices[Math.floor(Math.random() * vertices.length)];
        this.decorator.setVertexState(start, DecorationState.SELECTED);
        yield;
        let tour: Tour = { tour: [start], cost: 0 };

        while (tour.tour.length <= n) {
            yield* this.insertCheapest(tour.tour, graph, tour);
            if (tour == null || tour.tour == null) {
                console.error("Cheapest tour null before full tour found!");
                return;
            }
            this.decorator.clearAllDecoration();
            this.setPathState(tour.tour, DecorationState.SELECTED);
            yield;
        }
        this.path = createOutputGraph(tour.tour, graph);
    }

    private setPathState(path: number[], state: DecorationState) {
        this.decorator.setVertexState(path[0], state);
        for (let i = 1; i < path.length; i++) {
            this.decorator.setEdgeState(path[i - 1], path[i], state);
            this.decorator.setVertexState(path[i], state);
        }
    }

    private insert(tour: number[], vertex: number, graph: EuclideanGraph): Tour {
        // Insert given vertex to tour
        tour = tour.slice();
        let bestCost = Infinity;
        if (tour.length == 1) {
            tour.push(vertex);
            tour.push(tour[0]);
            bestCost = graph.getEdgeWeight(vertex, tour[0]) * 2;
        } else {
            let insertAt = 0;
            for (let i = 1; i < tour.length; i++) {
                const cost = graph.getEdgeWeight(tour[i - 1], vertex) +
                    graph.getEdgeWeight(vertex, tour[i]) -
                    graph.getEdgeWeight(tour[i - 1], tour[i]);
                if (cost < bestCost) {
                    insertAt = i;
                    bestCost = cost;
                }
            }
            tour.splice(insertAt, 0, vertex);
        }
        return { tour: tour, cost: bestCost };
    }

    private *insertCheapest(path: number[], graph: EuclideanGraph, out: Tour) {
        let cheapest = null;
        let minCost = Infinity;
        const pathSet = new Set(path);
        for (const n of graph.getVertexIds()) {
            if (pathSet.has(n)) {
                continue;
            }
            const result: Tour = this.insert(path, n, graph);
            this.decorator.clearAllDecoration();
            this.setPathState(result.tour, DecorationState.CONSIDERING);
            yield;
            if (result.cost < minCost) {
                minCost = result.cost;
                cheapest = result.tour;
            }
        }
        out.tour = cheapest; out.cost = minCost;
    }
}
