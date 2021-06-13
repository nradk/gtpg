import { Algorithm } from "../algorithm";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph } from "../../graph_core/graph";

export class KruskalMST implements Algorithm<void> {

    mst: WeightedGraph;
    edges: number[][];
    // A disjoint-set data structure for the forests
    forests: {[vertex: number]: number};
    edgesAdded: number;

    constructor(private decorator: Decorator) {
    }

    initialize() {
        const g = this.decorator.getGraph();
        if (!(g instanceof WeightedGraph) || g.isDirected()) {
            alert("Kruskal's algorithm needs a weighted undirected graph!");
            throw new Error("Kruskal: weighted undirected graph required!");
        }
        const graph = g as WeightedGraph;
        this.mst = new WeightedGraph(false)
        for (const v of graph.getVertexIds()) {
            this.mst.addVertex(v);
        }
        this.edges = graph.getEdgeList();
        this.edges.sort((first, second) => second[2] - first[2]);
        // Disable all edges
        for (const e of this.edges) {
            this.decorator.setEdgeState(e[0], e[1], "disabled");
        }
        this.forests = {};
        const vertices = graph.getVertexIds();
        for (let i = 0; i < vertices.length; i++) {
            this.forests[vertices[i]] = i;
        }
        // Keep track of how many edges have been added to the MST,
        // so we know when we are done.
        this.edgesAdded = 0;

    }

    getOutputGraph() {
        return this.mst;
    }

    getFullName() {
        return "Kruskal's Minimum Spanning Tree Algorithm";
    }

    getShortName() {
        return "Kruskal MST";
    }

    getDecorator(): Decorator {
        return this.decorator;
    }

    *run(): IterableIterator<void> {
        while (true) {
            const e = this.edges.pop();
            this.decorator.setEdgeState(e[0], e[1], "considering");
            // Yield now to let the user see the 'considering' state
            yield;
            // Check if e connects two vertices in different this.forests
            if (this.forests[e[0]] != this.forests[e[1]]) {
                // Add e to MST
                this.mst.addEdge(e[0], e[1], e[2]);
                this.edgesAdded += 1;
                // Select that edge
                this.decorator.setEdgeState(e[0], e[1], "selected");
                // Merge the this.forests
                const fa = this.forests[e[0]];
                const fb = this.forests[e[1]];
                for (const k of Object.keys(this.forests)) {
                    if (this.forests[k] == fb) {
                        this.forests[k] = fa;
                    }
                }
            } else {
                this.decorator.setEdgeState(e[0], e[1], "disabled");
            }
            // |E| = |V| - 1 in a tree
            if (this.edgesAdded < this.decorator.getGraph().getVertexIds().length - 1) {
                yield;
            } else {
                break;
            }
        }
    }
}
