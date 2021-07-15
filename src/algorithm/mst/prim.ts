import { Heap } from 'heap-js';

import { Algorithm, AlgorithmError, AlgorithmOutput } from "../algorithm";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph, Weighted, Graph } from "../../graph_core/graph";
import { DecorationState } from "../../decoration/decorator";
import { VertexInput } from "../../commontypes";
import { isSingleComponent } from "../../graph_core/graph_util";

export class PrimMST implements Algorithm<VertexInput> {

    mst: WeightedGraph;
    edgeQ: Heap<number[]>;
    inTree: Set<number>;
    notInTree: Set<number>;

    constructor(private decorator: Decorator) {
    }

    private initialize(input: VertexInput) {
        const g = this.decorator.getGraph();
        if (!g.isWeighted() || g.isDirected()) {
            throw new AlgorithmError("Prim's algorithm needs a weighted undirected graph!");
        }
        if (!isSingleComponent(g)) {
            throw new AlgorithmError("The graph doesn't have a spanning tree" +
                " because it has more than one component.");
        }
        const graph = g as Weighted & Graph;
        this.mst = new WeightedGraph(false)
        const vertexIds = [...graph.getVertexIds()];
        for (const v of vertexIds) {
            this.mst.addVertex(v, graph.getVertexLabel(v));
        }

        const edgeComparator = (a: number[], b: number[]) => a[2] - b[2];
        this.edgeQ = new Heap(edgeComparator);

        const firstVertex = input.vertexId;

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
                this.decorator.setVertexState(v, DecorationState.SELECTED);
            } else {
                // Add other vertices to the not-in-tree set
                this.notInTree.add(v);
                // Disable all other vertices
                this.decorator.setVertexState(v, DecorationState.DISABLED);
            }
        }

        // Disable all edges
        for (const edge of graph.getEdgeList()) {
            this.decorator.setEdgeState(edge[0], edge[1], DecorationState.DISABLED);
        }
    }

    *run(input: VertexInput): Generator<void, AlgorithmOutput, void> {
        this.initialize(input);
        while (this.notInTree.size > 0) {
            const edge = this.edgeQ.pop();
            this.decorator.setEdgeState(edge[0], edge[1], DecorationState.CONSIDERING);
            // Yield here to let the user see the 'considering' decoration
            yield;
            const [inside, outside, weight] = edge;
            if (!this.inTree.has(outside)) {
                this.mst.addEdge(inside, outside, weight);
                this.decorator.setEdgeState(inside, outside, DecorationState.SELECTED);
                this.decorator.setVertexState(outside, DecorationState.SELECTED);
                this.notInTree.delete(outside);
                this.inTree.add(outside);

                const graph = this.decorator.getGraph() as WeightedGraph;
                for (const n of graph.getVertexNeighborIds(outside)) {
                    if (!this.inTree.has(n)) {
                        this.edgeQ.add([outside, n, graph.getEdgeWeight(outside, n)]);
                        // this.decorator.setEdgeState(outside, n, DecorationState.DEFAULT);
                    }
                }
            } else {
                this.decorator.setEdgeState(inside, outside, DecorationState.DISABLED);
            }
            yield;
        }
        return {
            graph: this.mst,
            name: "MST",
            message: null
        };
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
