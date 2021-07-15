import { Algorithm, AlgorithmError, AlgorithmOutput } from "../algorithm";
import { Decorator } from "../../decoration/decorator";
import { Graph, Weighted, WeightedGraph } from "../../graph_core/graph";
import { DecorationState } from "../../decoration/decorator";
import { isSingleComponent } from "../../graph_core/graph_util";

export class KruskalMST implements Algorithm<void> {

    mst: WeightedGraph;
    edges: number[][];
    // A disjoint-set data structure for the forests
    forests: {[vertex: number]: number};
    edgesAdded: number;

    constructor(private decorator: Decorator) {
    }

    private initialize() {
        const g = this.decorator.getGraph();
        if (!g.isWeighted() || g.isDirected()) {
            throw new AlgorithmError("Kruskal's algorithm needs a weighted undirected graph!");
        }
        if (!isSingleComponent(g)) {
            throw new AlgorithmError("The graph doesn't have a spanning tree" +
                " because it has more than one component.");
        }
        const graph = g as Graph & Weighted;
        this.mst = new WeightedGraph(false)
        for (const v of graph.getVertexIds()) {
            this.mst.addVertex(v);
            this.decorator.setVertexState(v, DecorationState.DISABLED);
        }
        this.edges = graph.getEdgeList();
        this.edges.sort((first, second) => second[2] - first[2]);
        // Disable all edges
        for (const e of this.edges) {
            this.decorator.setEdgeState(e[0], e[1], DecorationState.DISABLED);
        }
        this.forests = {};
        const vertices = [...graph.getVertexIds()];
        for (let i = 0; i < vertices.length; i++) {
            this.forests[vertices[i]] = i;
        }
        // Keep track of how many edges have been added to the MST,
        // so we know when we are done.
        this.edgesAdded = 0;

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

    private l(vertex: number) {
        const graph = this.getDecorator().getGraph();
        return graph.getVertexLabel(vertex) ?? vertex.toString();
    }

    *run(): Generator<void, AlgorithmOutput, void> {
        this.initialize();
        const l = this.l.bind(this);
        let totalWeight = 0;
        while (this.edges.length > 0) {
            const e = this.edges.pop();
            this.decorator.setEdgeState(e[0], e[1], DecorationState.CONSIDERING);
            this.decorator.setStatusLine(`Considering edge ${l(e[0])}, ${l(e[1])}`);
            // Yield now to let the user see the 'considering' state
            yield;
            // Check if e connects two vertices in different this.forests
            if (this.forests[e[0]] != this.forests[e[1]]) {
                // Add e to MST
                this.mst.addEdge(e[0], e[1], e[2]);
                this.edgesAdded += 1;
                // Select that edge
                this.decorator.setEdgeState(e[0], e[1], DecorationState.SELECTED);
                this.decorator.setStatusLine(`Added edge ${l(e[0])}, ${l(e[1])} to MST`);
                totalWeight += e[2];
                this.decorator.setVertexState(e[0], DecorationState.SELECTED);
                this.decorator.setVertexState(e[1], DecorationState.SELECTED);
                // Merge the this.forests
                const fa = this.forests[e[0]];
                const fb = this.forests[e[1]];
                for (const k of Object.keys(this.forests)) {
                    if (this.forests[k] == fb) {
                        this.forests[k] = fa;
                    }
                }
            } else {
                this.decorator.setEdgeState(e[0], e[1], DecorationState.DISABLED);
            }
            // |E| = |V| - 1 in a tree
            if (this.edgesAdded < this.decorator.getGraph().getVertexIds().size - 1) {
                yield;
            } else {
                break;
            }
        }
        this.decorator.setStatusLine(`MST with weight ${totalWeight} found`);
        yield;
        this.decorator.setStatusLine(`MST with weight ${totalWeight} found`);
        yield;
        return {
            graph: this.mst,
            name: "MST",
            message: null,
        }
    }
}
