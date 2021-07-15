import { Algorithm, AlgorithmError, AlgorithmOutput } from "../algorithm";
import { Decorator } from "../../decoration/decorator";
import { Graph } from "../../graph_core/graph";
import { isSingleComponent } from "../../graph_core/graph_util";
import { DecorationState } from "../../decoration/decorator";
import { Message } from "../../ui_handlers/notificationservice";

export class ArticulationPoints implements Algorithm<void> {

    private graph: Graph;

    constructor(private decorator: Decorator) {
    }

    private initialize() {
        const graph = this.decorator.getGraph();
        if (graph.isDirected()) {
            throw new AlgorithmError("Articulation points algorithm only supports undirected graphs!");
        }
        if (!isSingleComponent(graph)) {
            throw new AlgorithmError("Please provide a graph with a single connected component.");
        }
        this.graph = graph.clone();
        for (const v of graph.getVertexIds()) {
            this.decorator.setVertexState(v, DecorationState.DISABLED);
        }
        for (const edge of graph.getEdgeList()) {
            this.decorator.setEdgeState(edge[0], edge[1], DecorationState.DISABLED);
        }
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

    *run(): Generator<void, AlgorithmOutput, void> {
        this.initialize();
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
        let articulationPoints = new Set<number>();
        function *art(u: number, v: number) {
            dfn[u] = num;
            L[u] = num;
            num += 1;
            if (v !== undefined) {
                decorator.setEdgeState(v, u, DecorationState.CONSIDERING);
            }
            decorator.setVertexState(u, DecorationState.CONSIDERING);
            let label = `D=${dfn[u]}`;
            that.decorator.setVertexExternalLabel(u, label);
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
                            articulationPoints.add(u);
                        }
                        yield;
                    }
                    L[u] = Math.min(L[u], L[w]);
                } else if (w !== v) {
                    L[u] = Math.min(L[u], dfn[w]);
                }
            }
            label = `D=${dfn[u]}, L=${L[u]}`;
            that.decorator.setVertexExternalLabel(u, label);
            yield;
        };
        yield* art(firstVertex, undefined);
        const message: Message = {
            level: "success",
            title: "Articulation Points",
            text: `${articulationPoints.size} articulation points and `
                + `${componentIndex} biconnected components found.`
        };
        if (articulationPoints.size == 0) {
            message.level = "warning";
            message.text = "No articulation points found."
        }
        return { graph: null, name: null, message: message };
    }
}
