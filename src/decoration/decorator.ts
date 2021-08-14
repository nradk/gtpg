import { Graph } from "../graph_core/graph";
import { GraphDrawing, EuclideanGraphDrawing } from "../drawing/graphdrawing";

export class DecorationState {
    static readonly DEFAULT = new DecorationState();
    static readonly SELECTED = new DecorationState();
    static readonly DISABLED = new DecorationState();
    static readonly CONSIDERING = new DecorationState();

    // These are for use by vertices and edges internally to show hover status.
    // More abstract names might be needed if we want to use these states from
    // algorithms as well.
    static readonly SELECT_HOVER = new DecorationState();
    static readonly DELETE_HOVER = new DecorationState();

    constructor(private id?: number) {
    }

    static getAuxiliaryState(id: number): DecorationState {
        return new DecorationState(id);
    }

    getAuxiliaryId(): number {
        return this.id;
    }

    isAuxiliary(): boolean {
        return this.id != undefined;
    }
}

export interface StatusSink {
    setStatus(text: string): void;
}

export type PathDecorationOption = "vertices-only" | "edges-only" | "both";

export interface Decorator {
    getGraph(): Graph;
    getVertexState(vertexId: number): DecorationState;
    setVertexState(vertexId: number, state: DecorationState): void;
    getEdgeState(startVertexId: number, endVertexId: number): DecorationState;
    setEdgeState(startVertexId: number, endVertexId: number, state: DecorationState): void;
    setVertexExternalLabel(vertexId: number, text: string): void;
    clearVertexExternalLabel(vertexId: number): void;
    setEdgeLabel(startVertexId: number, endVertexId: number, label: string): void;
    clearEdgeLabel(startVertexId: number, endVertexId: number): void;
    setPathState(path: number[], state: DecorationState, option: PathDecorationOption): void;
    setStatusLine(text: string): void;
    clearAllDecoration(): void;
}

export class DefaultDecorator implements Decorator {
    // The 26 colors from the Color Alphabet Project
    //static readonly auxiliaryColors = [ "#FFFF80", "#FFFF00", "#FFCC99",
        //"#FFA405", "#FFA8BB", "#FF5005", "#FF0010", "#F0A3FF", "#E0FF66",
        //"#C20088", "#990000", "#808080", "#426600", "#191919", "#003380",
        //"#00998F", "#993F00", "#740AFF", "#94FFB5", "#0075DC", "#9DCC00",
        //"#8F7C00", "#5EF1F2", "#005C31", "#4C005C", "#2BCE48" ];
    // From https://sashamaps.net/docs/resources/20-colors/
    static readonly auxiliaryColors = [ '#e6194b', '#3cb44b', '#ffe119',
        '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c',
        '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000',
        '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080', '#000000'
    ];

    constructor(protected drawing: GraphDrawing, protected statusSink: StatusSink) {
    }

    private getEdgeDrawing(startVertexId: number, endVertexId: number) {
        if (!this.drawing.getGraph().isDirected()) {
            [startVertexId, endVertexId] = this.drawing.getEdgeDrawingOrder(
                startVertexId, endVertexId);
        }
        return this.drawing.getEdgeDrawings()[startVertexId][endVertexId];
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
        return this.getEdgeDrawing(startVertexId, endVertexId).getDecorationState();
    }

    setEdgeState(startVertexId: number, endVertexId: number,
        state: DecorationState) {
        const edge = this.getEdgeDrawing(startVertexId, endVertexId);
        edge.setDecorationState(state);
        this.drawing.getStage().draw();
    }

    setVertexExternalLabel(vertexId: number, text: string): void {
        this.drawing.getVertexDrawings()[vertexId].setExternalLabel(text);
    }

    clearVertexExternalLabel(vertexId: number): void {
        this.drawing.getVertexDrawings()[vertexId].clearExternalLabel();
    }

    setEdgeLabel(startVertexId: number, endVertexId: number, label: string) {
        this.getEdgeDrawing(startVertexId, endVertexId).setEdgeLabel(label,
            _ => false);
    }

    clearEdgeLabel(startVertexId: number, endVertexId: number) {
        if (this.drawing.getGraph().isWeighted()) {
            this.drawing.setWeightAsEdgeLabel(startVertexId, endVertexId);
        } else {
            this.getEdgeDrawing(startVertexId, endVertexId).clearEdgeLabel();
        }
    }

    setStatusLine(text: string) {
        this.statusSink.setStatus(text);
    }

    clearAllDecoration() {
        for (const vertex of this.drawing.getGraph().getVertexIds()) {
            this.setVertexState(vertex, DecorationState.DEFAULT);
            this.drawing.getVertexDrawings()[vertex].clearExternalLabel();
        }
        for (const edge of this.drawing.getGraph().getEdgeList()) {
            this.setEdgeState(edge[0], edge[1], DecorationState.DEFAULT);
            this.clearEdgeLabel(edge[0], edge[1]);
        }
        this.setStatusLine('');
    }

    setPathState(path: number[], state: DecorationState, option: PathDecorationOption) {
        if (option != "edges-only") {
            this.setVertexState(path[0], state);
        }
        for (let i = 1; i < path.length; i++) {
            const start = path[i - 1];
            const end = path[i];
            if (option != "edges-only") {
                this.setVertexState(end, state);
            }
            if (option != "vertices-only") {
                this.setEdgeState(start, end, state);
            }
        }
    }
}

export class EuclideanDecorator extends DefaultDecorator {
    constructor(graphDrawing: EuclideanGraphDrawing, statusSink: StatusSink) {
        super(graphDrawing, statusSink);
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
        this.setStatusLine('');
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

    setEdgeLabel(_: number, __: number, ___: string) {
    }

    clearEdgeLabel(_: number, __: number) {
    }

    setStatusLine(_: string): void {
    }

    setPathState(_: number[], __: DecorationState, ___: PathDecorationOption): void {
    }
}
