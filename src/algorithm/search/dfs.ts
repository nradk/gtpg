import { Algorithm } from "../algorithm";
import { VertexInput } from "../../commontypes";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph, UnweightedGraph } from "../../graph_core/graph";

type VertexAndParent = [number, number];

export class DepthFirstSearch implements Algorithm<VertexInput> {

    searchTree: WeightedGraph | UnweightedGraph;;
    inTree: Set<number>;
    stack: VertexAndParent[];

    constructor(private decorator: Decorator) {
    }

    initialize(startVertex: VertexInput) {
        const graph = this.decorator.getGraph();
        if (graph instanceof WeightedGraph) {
            this.searchTree = new WeightedGraph(true);
        } else {
            this.searchTree = new UnweightedGraph(true);
        }
        const vertexIds = graph.getVertexIds();
        this.inTree = new Set();
        this.stack = [[startVertex.vertexId, undefined]];
        this.inTree.add(startVertex.vertexId);
        this.searchTree.addVertex(startVertex.vertexId);

        for (const v of vertexIds) {
            if (v == startVertex.vertexId) {
                // Select the initial vertex
                this.decorator.setVertexState(v, "selected");
            } else {
                // Disable all other vertices
                this.decorator.setVertexState(v, "disabled");
            }
        }

        // Disable all edges
        for (const edge of graph.getEdgeList()) {
            this.decorator.setEdgeState(edge[0], edge[1], "disabled");
        }
    }

    *run() {
        while (this.stack.length > 0) {
            const [v, vparent] = this.stack.pop();
            const graph = this.decorator.getGraph();
            for (const n of graph.getVertexNeighborIds(v)) {
                if (this.inTree.has(n)) {
                    continue;
                }
                this.stack.push([n, v]);
                this.decorator.setVertexState(n, "considering");
                this.decorator.setEdgeState(v, n, "considering");
            }

            if (!this.inTree.has(v)) {
                this.searchTree.addVertex(v);
                this.inTree.add(v);
                if (vparent != undefined) {
                    if (this.searchTree instanceof WeightedGraph) {
                        const g = graph as WeightedGraph;
                        this.searchTree.addEdge(vparent, v,
                            g.getEdgeWeight(vparent, v));
                    } else {
                        this.searchTree.addEdge(vparent, v);
                    }
                    this.decorator.setEdgeState(vparent, v, "selected");
                    this.decorator.setVertexState(v, "selected");
                }
            } else {
                // this.decorator.setVertexState(v, "selected");
                if (vparent != undefined) {
                    this.decorator.setEdgeState(vparent, v, "disabled");
                }
            }

            yield;
        }
    }

    getOutputGraph() {
        return this.searchTree;
    }

    getFullName() {
        return "Depth First Search Algorithm";
    }

    getShortName() {
        return "DFS";
    }

    getDecorator() {
        return this.decorator;
    }
}
