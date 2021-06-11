import { Algorithm } from "../algorithm";
import { VertexInput } from "../../commontypes";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph, UnweightedGraph } from "../../graph_core/graph";

export class BreadthFirstSearch implements Algorithm<VertexInput> {

    searchTree: WeightedGraph | UnweightedGraph;;
    inTree: Set<number>;
    queue: number[];

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
        this.queue = [startVertex.vertexId];
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

    step(): boolean {
        const v = this.queue.shift();
        const graph = this.decorator.getGraph();
        for (const n of graph.getVertexNeighborIds(v)) {
            if (this.inTree.has(n)) {
                continue;
            }
            this.searchTree.addVertex(n);
            if (this.searchTree instanceof WeightedGraph) {
                const g = graph as WeightedGraph;
                this.searchTree.addEdge(v, n, g.getEdgeWeight(v, n));
            } else {
                this.searchTree.addEdge(v, n);
            }
            this.inTree.add(n);

            this.decorator.setVertexState(n, "selected");
            this.decorator.setEdgeState(v, n, "selected");

            this.queue.push(n);
        }
        return this.queue.length > 0;
    }

    getOutputGraph() {
        return this.searchTree;
    }

    getFullName() {
        return "Breadth First Search Algorithm";
    }

    getShortName() {
        return "BFS";
    }

    getDecorator() {
        return this.decorator;
    }
}
