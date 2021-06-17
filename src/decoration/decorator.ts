import { Graph } from "../graph_core/graph";
import GraphDrawing from "../drawing/graphdrawing";

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

export class DefaultDecorator implements Decorator {
    private drawing: GraphDrawing;

    constructor(graphDrawing: GraphDrawing) {
        this.drawing = graphDrawing;
    }

    getGraph(): Graph {
        return this.drawing.getGraph();
    }

    getVertexState(vertexId: number): DecorationState {
        return this.drawing.getVertexDrawings()[vertexId].getDecorationState();
    }

    setVertexState(vertexId: number, state: DecorationState) {
        const vertexDrawings = this.drawing.getVertexDrawings();
        vertexDrawings[vertexId].setDecorationState(state);
        vertexDrawings[vertexId].draw();
    }

    getEdgeState(startVertexId: number, endVertexId: number): DecorationState {
        if (!this.drawing.getGraph().isDirected()) {
            [startVertexId, endVertexId] = this.drawing.getEdgeDrawingOrder(
                startVertexId, endVertexId);
        }
        return this.drawing.getEdgeDrawings()[startVertexId][endVertexId]
            .getDecorationState();
    }

    setEdgeState(startVertexId: number, endVertexId: number,
        state: DecorationState) {
        if (!this.drawing.getGraph().isDirected()) {
            [startVertexId, endVertexId] = this.drawing.getEdgeDrawingOrder(
                startVertexId, endVertexId);
        }
        const edge = this.drawing.getEdgeDrawings()[startVertexId][endVertexId];
        edge.setDecorationState(state);
        this.drawing.getStage().draw();
    }

    setVertexExternalLabel(vertexId: number, text: string): void {
        this.drawing.getVertexDrawings()[vertexId].setExternalLabel(text);
    }

    clearVertexExternalLabel(vertexId: number): void {
        this.drawing.getVertexDrawings()[vertexId].clearExternalLabel();
    }

    clearAllDecoration() {
        for (const vertex of this.drawing.getGraph().getVertexIds()) {
            this.setVertexState(vertex, "default");
            this.drawing.getVertexDrawings()[vertex].clearExternalLabel();
        }
        for (const edge of this.drawing.getGraph().getEdgeList()) {
            this.setEdgeState(edge[0], edge[1], "default");
        }
    }
}
