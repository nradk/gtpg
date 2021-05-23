import { Algorithm } from "./algorithm";
import { Decorator } from "../decoration/decorator";
import { WeightedGraph } from "../graph_core/graph";

export class KruskalMST implements Algorithm {

    execute(decorator: Decorator) {
        const g = decorator.getGraph();
        if (!(g instanceof WeightedGraph) || g.isDirected()) {
            console.warn("Kruskal: weighted undirected graph required!");
            alert("Kruskal's algorithm needs a weighted undirected graph!");
            return;
        }
        const graph = g as WeightedGraph;
        const mst = new WeightedGraph(false)
        for (const v of graph.getVertexIds()) {
            mst.addVertex(v);
        }
        // const addedVertices: number = [];
        const edges = graph.getEdgeList();
        edges.sort((first, second) => second[2] - first[2]);
        // Disable all edges
        for (const e of edges) {
            decorator.setEdgeState(e[0], e[1], "disabled");
        }
        // Create a disjoint-set data structure for the forests
        const forests: {[vertex: number]: number} = {};
        const vertices = graph.getVertexIds();
        for (let i = 0; i < vertices.length; i++) {
            forests[vertices[i]] = i;
        }
        const timerId = setInterval(() => {
            const e = edges.pop();
            // Check if e connects two vertices in different forests
            if (forests[e[0]] != forests[e[1]]) {
                // Add e to MST
                mst.addEdge(e[0], e[1], e[2]);
                // Select that edge
                decorator.setEdgeState(e[0], e[1], "selected");
                // Merge the forests
                const fa = forests[e[0]];
                const fb = forests[e[1]];
                for (const k of Object.keys(forests)) {
                    if (forests[k] == fb) {
                        forests[k] = fa;
                    }
                }
            }
            if (edges.length == 0) {
                clearInterval(timerId);
            }
        }, 400);
    }
}
