import { Algorithm } from "../algorithm";
import { Decorator } from "../../decoration/decorator";
import { Graph } from "../../graph_core/graph";
import { isSingleComponent } from "../../graph_core/graph_util";
import { DecorationState } from "../../decoration/decorator";

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
            this.decorator.setVertexState(v, DecorationState.DISABLED);
        }
        for (const edge of graph.getEdgeList()) {
            this.decorator.setEdgeState(edge[0], edge[1], DecorationState.DISABLED);
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
        let componentIndex = 0;
        function *art(u: number, v: number) {
            dfn[u] = num;
            L[u] = num;
            num += 1;
            if (v !== undefined) {
                decorator.setEdgeState(v, u, DecorationState.CONSIDERING);
            }
            decorator.setVertexState(u, DecorationState.CONSIDERING);
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
                        const edgeState = DecorationState.getAuxiliaryState(componentIndex);
                        componentIndex++;
                        do {
                            edge = s.pop();
                            decorator.setEdgeState(edge[0], edge[1], edgeState);
                            if (decorator.getVertexState(edge[0]) !== DecorationState.SELECTED) {
                                decorator.setVertexState(edge[0], DecorationState.DEFAULT);
                            }
                            if (decorator.getVertexState(edge[1]) !== DecorationState.SELECTED) {
                                decorator.setVertexState(edge[1], DecorationState.DEFAULT);
                            }
                        } while (!(edge[0] == u && edge[1] == w || edge[0] == w && edge[1] == u));
                        if (u !== firstVertex || nChildren > 1) {
                            decorator.setVertexState(u, DecorationState.SELECTED);
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
