import { Algorithm } from "../algorithm";
import { Decorator } from "../../decoration/decorator";
import { Graph } from "../../graph_core/graph";
import { isSingleComponent } from "../../graph_core/graph_util";

export class ArticulationPoints implements Algorithm<void> {

    private graph: Graph;

    constructor(private decorator: Decorator) {
    }

    initialize() {
        const graph = this.decorator.getGraph();
        if (graph.isDirected()) {
            alert("Articulation points algorithm only supports undirected graphs!");
            throw new Error("Articulation: undirected graph required!");
        }
        if (!isSingleComponent(graph)) {
            alert("Please provide a graph with a single connected component.");
            throw new Error("Articulation: More than 1 component!");
        }
        this.graph = graph.clone();
        for (const v of graph.getVertexIds()) {
            this.decorator.setVertexState(v, "disabled");
        }
        for (const edge of graph.getEdgeList()) {
            this.decorator.setEdgeState(edge[0], edge[1], "disabled");
        }
    }

    getOutputGraph() {
        return this.graph;
    }

    getFullName() {
        return "Hopcroft-Tarjan Algorithm for Articulation Points & Biconnected Components";
    }

    getShortName() {
        return "Articulation Points";
    }

    getDecorator(): Decorator {
        return this.decorator;
    }

    *run(): IterableIterator<void> {
        const dfn: {[v: number]: number} = {};
        const L: {[v: number]: number} = {};
        const vertices = this.graph.getVertexIds();
        // const n = vertices.size;
        for (const v of vertices) {
            dfn[v] = 0;
        }
        let num = 1;
        const that = this;
        const decorator = this.decorator;
        const s: number[][] = [];
        const firstVertex = this.graph.getVertexIds().values().next().value;
        function *art(u: number, v: number) {
            dfn[u] = num;
            L[u] = num;
            num += 1;
            if (v !== undefined) {
                decorator.setEdgeState(v, u, "considering");
            }
            decorator.setVertexState(u, "considering");
            yield;
            let nChildren = 0;
            for (const w of that.graph.getVertexNeighborIds(u)) {
                if (v !== w && dfn[w] < dfn[u]) {
                    s.push([u, w]);
                }
                if (dfn[w] === 0) { // w is unvisited
                    nChildren += 1;
                    yield* art(w, u);
                    if (L[w] >= dfn[u]) {
                        // Found a biconnected component
                        let edge: number[];
                        do {
                            edge = s.pop();
                            decorator.setEdgeState(edge[0], edge[1], "default");
                            if (decorator.getVertexState(edge[0]) != "selected") {
                                decorator.setVertexState(edge[0], "default");
                            }
                            if (decorator.getVertexState(edge[1]) != "selected") {
                                decorator.setVertexState(edge[1], "default");
                            }
                        } while (!(edge[0] == u && edge[1] == w || edge[0] == w && edge[1] == u));
                        if (u !== firstVertex || nChildren > 1) {
                            decorator.setVertexState(u, "selected");
                        }
                    }
                    L[u] = Math.min(L[u], L[w]);
                } else if (w !== v) {
                    L[u] = Math.min(L[u], dfn[w]);
                }
            }
            that.decorator.setVertexExternalLabel(u, L[u].toString());
            yield;
        };
        yield* art(firstVertex, undefined);
    }
}
