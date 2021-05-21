import { Graph } from "../graph_core/graph";

export type DecorationState = "selected" | "disabled" | "default";

export interface Decorator {
    getGraph(): Graph;
    setVertexState(vertexId: number, state: DecorationState): void;
    setEdgeState(startVertexId: number, endVertexId: number, state: DecorationState): void;
}
