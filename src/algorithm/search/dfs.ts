import { Algorithm } from "../algorithm";
import { VertexInput } from "../../commontypes";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph, UnweightedGraph, Weighted, Graph } from "../../graph_core/graph";
import { DecorationState } from "../../decoration/decorator";

type VertexAndParent = [number, number];

export class DepthFirstSearch implements Algorithm<VertexInput> {

    searchTree: WeightedGraph | UnweightedGraph;;
    inTree: Set<number>;
    stack: VertexAndParent[];

    constructor(private decorator: Decorator) {
    }

    private initialize(startVertex: VertexInput) {
        const graph = this.decorator.getGraph();
        if (graph.isWeighted()) {
            this.searchTree = new WeightedGraph(true);
        } else {
            this.searchTree = new UnweightedGraph(true);
        }
        const vertexIds = graph.getVertexIds();
        this.inTree = new Set();
        this.stack = [[startVertex.vertexId, undefined]];
        this.inTree.add(startVertex.vertexId);
        this.searchTree.addVertex(startVertex.vertexId,
            graph.getVertexLabel(startVertex.vertexId));

        for (const v of vertexIds) {
            if (v == startVertex.vertexId) {
                // Select the initial vertex
                this.decorator.setVertexState(v, DecorationState.SELECTED);
            } else {
                // Disable all other vertices
                this.decorator.setVertexState(v, DecorationState.DISABLED);
            }
        }

        // Disable all edges
        for (const edge of graph.getEdgeList()) {
            this.decorator.setEdgeState(edge[0], edge[1], DecorationState.DISABLED);
        }
    }

    *run(startVertex: VertexInput) {
        this.initialize(startVertex);
        while (this.stack.length > 0) {
            const [v, vparent] = this.stack.pop();
            const graph = this.decorator.getGraph();
            for (const n of graph.getVertexNeighborIds(v)) {
                if (this.inTree.has(n)) {
                    continue;
                }
                this.stack.push([n, v]);
                this.decorator.setVertexState(n, DecorationState.CONSIDERING);
                this.decorator.setEdgeState(v, n, DecorationState.CONSIDERING);
            }

            if (!this.inTree.has(v)) {
                this.searchTree.addVertex(v, graph.getVertexLabel(v));
                this.inTree.add(v);
                if (vparent != undefined) {
                    if (this.searchTree.isWeighted()) {
                        const g = graph as Weighted & Graph;
                        this.searchTree.addEdge(vparent, v,
                            g.getEdgeWeight(vparent, v));
                    } else {
                        this.searchTree.addEdge(vparent, v);
                    }
                    this.decorator.setEdgeState(vparent, v, DecorationState.SELECTED);
                    this.decorator.setVertexState(v, DecorationState.SELECTED);
                }
            } else {
                // this.decorator.setVertexState(v, DecorationState.SELECTED);
                if (vparent != undefined) {
                    this.decorator.setEdgeState(vparent, v, DecorationState.DISABLED);
                }
            }

            yield;
        }
        return {
            graph: this.searchTree,
            name: "DFS Tree",
            message: null
        }
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
