import { Graph } from "../graph_core/graph";
import { GraphDrawing, EuclideanGraphDrawing } from "../drawing/graphdrawing";

export class DecorationState {
    static readonly DEFAULT = new DecorationState();
    static readonly SELECTED = new DecorationState();
    static readonly DISABLED = new DecorationState();
    static readonly CONSIDERING = new DecorationState();

    private constructor(private id?: number) {
    }

    static getAuxiliaryState(id: number): DecorationState {
        return new DecorationState(id);
    }

    getAuxiliaryId(): number {
        return this.id;
    }
}

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
    protected drawing: GraphDrawing;
    static readonly auxiliaryColors = ["#795548", "#FFEB3B",
        "#C0CA33", "#43A047", "#009688", "#2196F3", "#673AB7", "#E91E63",
        "#9C27B0", "#546E7A"];

    constructor(graphDrawing: GraphDrawing) {
        this.drawing = graphDrawing;
    }

    static getAuxiliaryColor(id: number) {
        const arr = DefaultDecorator.auxiliaryColors;
        return arr[id % arr.length];
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
            this.setVertexState(vertex, DecorationState.DEFAULT);
            this.drawing.getVertexDrawings()[vertex].clearExternalLabel();
        }
        for (const edge of this.drawing.getGraph().getEdgeList()) {
            this.setEdgeState(edge[0], edge[1], DecorationState.DEFAULT);
        }
    }
}

export class EuclideanDecorator extends DefaultDecorator {
    constructor(graphDrawing: EuclideanGraphDrawing) {
        super(graphDrawing);
    }

    getEdgeState(startVertexId: number, endVertexId: number): DecorationState {
        const edgeInOrder =  this.drawing.getEdgeDrawingOrder(
            startVertexId, endVertexId);
        if (edgeInOrder == null) {
            // If no edge drawing exists, then the state is disabled
            return DecorationState.DISABLED;
        }
        [startVertexId, endVertexId] = edgeInOrder;
        return this.drawing.getEdgeDrawings()[startVertexId][endVertexId]
            .getDecorationState();
    }

    setEdgeState(startVertexId: number, endVertexId: number,
            state: DecorationState) {
        const edgeInOrder =  this.drawing.getEdgeDrawingOrder(
            startVertexId, endVertexId);
        if (edgeInOrder == null) {
            if (state !== DecorationState.DISABLED) {
                const ed = this.drawing.createEdgeDrawing(startVertexId, endVertexId);
                this.drawing.storeAndShowEdgeDrawing(ed, startVertexId, endVertexId);
                ed.setDecorationState(state);
            }
        } else {
            [startVertexId, endVertexId] = edgeInOrder;
            if (state === DecorationState.DISABLED) {
                // We need to remove the edge drawing in this case
                this.drawing.removeEdgeDrawing(startVertexId, endVertexId);
            } else  {
                const edge = this.drawing.getEdgeDrawings()[startVertexId][endVertexId];
                edge.setDecorationState(state);
            }
        }
        this.drawing.getStage().draw();
    }

    clearAllDecoration() {
        for (const vertex of this.drawing.getGraph().getVertexIds()) {
            this.setVertexState(vertex, DecorationState.DEFAULT);
            this.drawing.getVertexDrawings()[vertex].clearExternalLabel();
        }
        const edges: number[][] = this.drawing.getEdgeDrawingKeyList();
        for (const [f, t] of edges) {
            this.drawing.removeEdgeDrawing(f, t, false);
        }
        this.drawing.redrawGraph();
    }
}

export class HeadlessDecorator implements Decorator {
    constructor(private graph: Graph) {
    }

    getGraph(): Graph {
        return this.graph;
    }

    getVertexState(_: number): DecorationState {
        return DecorationState.DEFAULT;
    }

    setVertexState(_: number, __: DecorationState): void {
    }

    getEdgeState(_: number, __: number): DecorationState {
        return DecorationState.DEFAULT;
    }

    setEdgeState(_: number, __: number, ___: DecorationState): void {
    }

    setVertexExternalLabel(_: number, __: string): void {
    }

    clearVertexExternalLabel(_: number): void {
    }

    clearAllDecoration(): void {
    }
}
