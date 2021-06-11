import { Heap } from 'heap-js';

import { Algorithm } from "../algorithm";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph } from "../../graph_core/graph";

export class PrimMST implements Algorithm<void> {

    mst: WeightedGraph;
    edgeQ: Heap<number[]>;
    inTree: Set<number>;
    notInTree: Set<number>;
    nextEdge: number[];

    constructor(private decorator: Decorator) {
    }

    initialize() {
        const g = this.decorator.getGraph();
        if (!(g instanceof WeightedGraph) || g.isDirected()) {
            alert("Prim's algorithm needs a weighted undirected graph!");
            throw new Error("Prim: weighted undirected graph required!");
        }
        const graph = g as WeightedGraph;
        this.mst = new WeightedGraph(false)
        const vertexIds = graph.getVertexIds();
        for (const v of vertexIds) {
            this.mst.addVertex(v);
        }

        const edgeComparator = (a: number[], b: number[]) => a[2] - b[2];
        this.edgeQ = new Heap(edgeComparator);

        const firstVertex = vertexIds[Math.floor(
            Math.random() * vertexIds.length)];

        this.inTree = new Set();
        this.inTree.add(firstVertex);

        for (const n of graph.getVertexNeighborIds(firstVertex)) {
            if (!this.inTree.has(n)) {
                this.edgeQ.push([firstVertex, n, graph.getEdgeWeight(firstVertex, n)]);
            }
        }

        this.notInTree = new Set();
        for (const v of vertexIds) {
            if (v == firstVertex) {
                // Select the initial vertex
                this.decorator.setVertexState(v, "selected");
            } else {
                // Add other vertices to the not-in-tree set
                this.notInTree.add(v);
                // Disable all other vertices
                this.decorator.setVertexState(v, "disabled");
            }
        }

        // Disable all edges
        for (const edge of graph.getEdgeList()) {
            this.decorator.setEdgeState(edge[0], edge[1], "disabled");
        }

        console.log("graph:", graph.adjacencyMap);
    }

    step(): boolean {
        if (this.nextEdge == undefined) {
            const e = this.edgeQ.pop();
            this.decorator.setEdgeState(e[0], e[1], "considering");
            this.nextEdge = e;
            // Return here to let the user see the 'considering' decoration
            return true;
        }
        const edge = this.nextEdge;
        const [inside, outside, weight] = edge;
        if (!this.inTree.has(outside)) {
            this.mst.addEdge(inside, outside, weight);
            console.log(`Adding edge ${inside}, ${outside} to mst`);
            this.decorator.setEdgeState(inside, outside, "selected");
            this.decorator.setVertexState(outside, "selected");
            this.notInTree.delete(outside);
            this.inTree.add(outside);

            const graph = this.decorator.getGraph() as WeightedGraph;
            for (const n of graph.getVertexNeighborIds(outside)) {
                if (!this.inTree.has(n)) {
                    console.log(`Adding edge ${outside}, ${n} to queue`);
                    this.edgeQ.add([outside, n, graph.getEdgeWeight(outside, n)]);
                    // this.decorator.setEdgeState(outside, n, "default");
                }
            }
        } else {
            this.decorator.setEdgeState(inside, outside, "disabled");
        }
        this.nextEdge = undefined;
        return this.notInTree.size > 0;
    }

    getOutputGraph() {
        return this.mst;
    }

    getFullName() {
        return "Prim's Minimum Spanning Tree Algorithm";
    }

    getShortName() {
        return "Prim MST";
    }

    getDecorator() {
        return this.decorator;
    }
}
