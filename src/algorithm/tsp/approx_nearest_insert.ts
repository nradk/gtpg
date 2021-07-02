import { Algorithm } from "../algorithm";
import { Decorator, DecorationState } from "../../decoration/decorator";
import { Graph } from "../../graph_core/graph";
import { EuclideanGraph } from "../../graph_core/euclidean_graph";
import { createOutputGraph } from "../../graph_core/graph_util";

export class TSPApproxNearestInsert implements Algorithm<void> {

    private path: Graph;

    constructor(private decorator: Decorator) {
    }

    initialize() {
        const graph = this.decorator.getGraph();
        if (!(graph instanceof EuclideanGraph)) {
            alert("Nearest insert TSP approximation algorithm only supports"
                + " Euclidean graphs!");
            throw new Error("TSP_APPROX_NN: Euclidean graph required!");
        }
        if (graph.getNumberOfVertices() < 2) {
            alert("Nearest insert TSP approximation algorithm requires at"
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
        return "Nearest-Insert TSP Approximation Algorithm";
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
        const tour: number[] = [start];

        while (tour.length <= n) {
            const nearest = this.getNearestToPath(tour, graph);
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
            } else {
                let insertAt = 0;
                let bestCost = Infinity;
                for (let i = 1; i < tour.length; i++) {
                    const cost = graph.getEdgeWeight(tour[i - 1], nearest) +
                        graph.getEdgeWeight(nearest, tour[i]) -
                        graph.getEdgeWeight(tour[i - 1], tour[i]);
                    if (cost < bestCost) {
                        insertAt = i;
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
                //if (tour.length == 4) {
                    //console.log(tour);
                    //// This is the first time that the tour actually becomes a
                    //// cycle, so select that extra 'cyclic' edge
                    //this.decorator.setEdgeState(tour[2], tour[3],
                        //DecorationState.SELECTED);
                //}
            }
            this.decorator.setVertexState(nearest, DecorationState.SELECTED);
            yield;
        }
        this.path = createOutputGraph(tour, graph);
    }

    private getNearestToPath(path: number[], graph: EuclideanGraph) {
        let nearest = null;
        let minDist = Infinity;
        for (const p of path) {
            const nn = graph.getNearestNeighbor(p, new Set(path));
            const dist = graph.getEdgeWeight(p, nn);
            if (dist < minDist) {
                minDist = dist;
                nearest = nn;
            }
        }
        return nearest;
    }

}
