import { Graph } from "../graph_core/graph";

export type DecorationState = "selected" | "disabled" | "default" | "considering";

export interface Decorator {
    getGraph(): Graph;
    getVertexState(vertexId: number): DecorationState;
    setVertexState(vertexId: number, state: DecorationState): void;
    getEdgeState(startVertexId: number, endVertexId: number): DecorationState;
    setEdgeState(startVertexId: number, endVertexId: number, state: DecorationState): void;
    setVertexExternalLabel(vertexId: number, text: string): void;
    clearVertexExternalLabel(vertexId: number): void;
    clearAllDecoration(): void;
}
