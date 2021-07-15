import { Heap } from 'heap-js';

import { Algorithm, AlgorithmError } from "../algorithm";
import { VertexInput } from "../../commontypes";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph, Weighted, Graph } from "../../graph_core/graph";
import { DecorationState } from "../../decoration/decorator";
import { getNumStringForLabels } from "../../util";

type VertexAndDistance = [number, number];

export class DijkstrasShortestPath implements Algorithm<VertexInput> {

    private queue: Heap<VertexAndDistance>;
    // The parent of each vertex in the shortest-distance tree
    private parents: {[vId: number]: number};
    private distances: {[vId: number]: number};
    private shortestPathTree: WeightedGraph;

    constructor(private decorator: Decorator) {
    }

    private initialize(startVertex: VertexInput) {
        const graph = this.decorator.getGraph();
        if (!graph.isWeighted()) {
            throw new AlgorithmError("Dijkstra's algorithm needs a weighted graph!");
        }
        const vertexIds = graph.getVertexIds();
        const distanceComparator = (a: VertexAndDistance,
            b: VertexAndDistance) => a[1] - b[1];
        this.shortestPathTree = new WeightedGraph(true);
        this.queue = new Heap<VertexAndDistance>(distanceComparator);
        this.parents = {};
        this.distances = {};

        const v = startVertex.vertexId;
        this.shortestPathTree.addVertex(v, graph.getVertexLabel(v));
        for (const v of vertexIds) {
            if (v == startVertex.vertexId) {
                // Select the initial vertex, and set its distance to 0
                this.decorator.setVertexState(v, DecorationState.SELECTED);
                this.decorator.setVertexExternalLabel(v, "0");
                this.distances[v] = 0;
            } else {
                // Disable all other vertices and set their (initial) distance
                // to Infinity
                this.decorator.setVertexState(v, DecorationState.DISABLED);
                this.decorator.setVertexExternalLabel(v, "∞");
                this.distances[v] = Infinity;
            }
            // Add vertices to the queue
            this.queue.push([v, this.distances[v]]);
        }

        // Disable all edges
        for (const edge of graph.getEdgeList()) {
            this.decorator.setEdgeState(edge[0], edge[1], DecorationState.DISABLED);
        }
    }

    *run(startVertex: VertexInput) {
        this.initialize(startVertex);
        const graph = this.decorator.getGraph() as Weighted & Graph;
        yield;
        while (this.queue.length > 0) {
            const [v, vDist] = this.queue.pop();
            if (this.distances[v] < vDist) {
                continue;
            }
            if (this.parents[v] != undefined) {
                this.shortestPathTree.addVertex(v, graph.getVertexLabel(v));
                this.shortestPathTree.addEdge(this.parents[v], v,
                    graph.getEdgeWeight(this.parents[v], v));
                this.decorator.setEdgeState(this.parents[v], v, DecorationState.SELECTED);
                this.decorator.setVertexState(v, DecorationState.SELECTED);
                yield;
            }
            for (const n of graph.getVertexNeighborIds(v)) {
                const dist = vDist + graph.getEdgeWeight(v, n);
                if (dist < this.distances[n]) {
                    this.decorator.setEdgeState(v, n, DecorationState.CONSIDERING);
                    this.decorator.setVertexState(n, DecorationState.CONSIDERING);
                    this.decorator.setVertexExternalLabel(n, getNumStringForLabels(dist));
                    yield;
                    this.distances[n] = dist;
                    this.parents[n] = v;
                    this.queue.push([n, dist]);
                }
            }
        }
        for (const e of graph.getEdgeList()) {
            if (this.decorator.getEdgeState(e[0], e[1]) == DecorationState.CONSIDERING) {
                this.decorator.setEdgeState(e[0], e[1], DecorationState.DISABLED);
            }
        }
        return {
            graph: this.shortestPathTree,
            name: "Shortest Path Tree",
            message: null
        }
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
