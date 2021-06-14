import { Heap } from 'heap-js';

import { Algorithm } from "../algorithm";
import { VertexInput } from "../../commontypes";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph } from "../../graph_core/graph";

type VertexAndDistance = [number, number];

export class DijkstrasShortestPath implements Algorithm<VertexInput> {

    queue: Heap<VertexAndDistance>;
    // The parent of each vertex in the shortest-distance tree
    parents: {[vId: number]: number};
    distances: {[vId: number]: number};

    constructor(private decorator: Decorator) {
    }

    initialize(startVertex: VertexInput) {
        const graph = this.decorator.getGraph();
        if (!(graph instanceof WeightedGraph)) {
            alert("Dijkstra's algorithm needs a weighted graph!");
            throw new Error("Dijkstra: weighted graph required!");
        }
        const vertexIds = graph.getVertexIds();
        const distanceComparator = (a: VertexAndDistance,
            b: VertexAndDistance) => a[1] - b[1];
        this.queue = new Heap<VertexAndDistance>(distanceComparator);
        this.parents = {};
        this.distances = {};

        for (const v of vertexIds) {
            if (v == startVertex.vertexId) {
                // Select the initial vertex, and set its distance to 0
                this.decorator.setVertexState(v, "selected");
                this.distances[v] = 0;
            } else {
                // Disable all other vertices and set their (initial) distance
                // to Infinity
                this.decorator.setVertexState(v, "disabled");
                this.distances[v] = Infinity;
            }
            // Add vertices to the queue
            this.queue.push([v, this.distances[v]]);
        }

        // Disable all edges
        for (const edge of graph.getEdgeList()) {
            this.decorator.setEdgeState(edge[0], edge[1], "disabled");
        }
    }

    *run() {
        const graph = this.decorator.getGraph() as WeightedGraph;
        yield;
        while (this.queue.length > 0) {
            const [v, vDist] = this.queue.pop();
            if (this.distances[v] < vDist) {
                continue;
            }
            if (this.parents[v] != undefined) {
                this.decorator.setEdgeState(this.parents[v], v, "selected");
            }
            this.decorator.setVertexState(v, "selected");
            yield;
            for (const n of graph.getVertexNeighborIds(v)) {
                const dist = vDist + graph.getEdgeWeight(v, n);
                if (dist < this.distances[n]) {
                    this.decorator.setEdgeState(v, n, "considering");
                    this.decorator.setVertexState(n, "considering"); yield;
                    this.distances[n] = dist;
                    this.parents[n] = v;
                    this.queue.push([n, dist]);
                }
            }
        }
        for (const e of graph.getEdgeList()) {
            if (this.decorator.getEdgeState(e[0], e[1]) == "considering") {
                this.decorator.setEdgeState(e[0], e[1], "disabled");
            }
        }
    }

    getOutputGraph() {
        return null;
    }

    getFullName() {
        return "Dijkstra's Shortest Path Algorithm";
    }

    getShortName() {
        return "Dijkstra";
    }

    getDecorator() {
        return this.decorator;
    }
}
