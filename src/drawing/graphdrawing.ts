import Konva from "konva";

import VertexDrawing from "./vertexdrawing";
import EdgeDrawing from "./edgedrawing";
import * as Graphs from "../graph_core/graph";
import * as Layouts from "../drawing/layouts";
import { getMouseEventXY } from "./util";
import { Vector2,  Util } from "../commontypes";
import { Decorator, DecorationState } from "../decoration/decorator";

type CentroidCache = { n: number; xSum: number; ySum: number };


export default class GraphDrawing {
    private vertexDrawings : {[id: number]: VertexDrawing};
    // For undirected graphs, 'start' is always smaller than 'end'
    private edgeDrawings : {[start: number]: { [end: number]: EdgeDrawing }};
    private graph : Graphs.Graph;
    private selectedVertex : VertexDrawing;
    private stage : Konva.Stage;
    private verticesLayer : Konva.Layer;
    private edgesLayer : Konva.Layer;
    private continuousLayoutTimer: number;
    private positions: Layouts.PositionMap;
    private vertexRadius: number;

    private centroidCache: CentroidCache;

    constructor(graph?: Graphs.Graph) {
        if (graph === undefined) {
            this.graph = new Graphs.UnweightedGraph(false);
        } else {
            this.graph = graph;
        }
        this.vertexDrawings = {};
        this.positions = {};
        this.verticesLayer = new Konva.Layer();
        this.edgesLayer = new Konva.Layer();
        this.vertexRadius = 15;

        this.centroidCache = {
            n: this.graph.getNumberOfVertices(),
            xSum: 0, ySum: 0
        };
    }

    setStage(stage: Konva.Stage): void {
        this.stage = stage;
        this.stage.removeChildren();
        this.stage.add(this.edgesLayer).add(this.verticesLayer);
        this.stage.on('click', this.addVertexToCurrentGraph.bind(this));
    }

    renderGraph(layout?: Layouts.Layout) {
        if (!this.stage) {
            throw Error("Stage needs to be set before call to renderGraph()");
        }

        this.edgesLayer.removeChildren();
        this.verticesLayer.removeChildren();

        if (Object.keys(this.vertexDrawings).length == 0 || layout != undefined) {
            // If no vertices present and no layout given, use empty layout
            this.layoutWithoutRender(layout ?? new Layouts.EmptyLayout());
        }

        // Add edgedrawings and vertexdrawings to their respective layers
        Object.keys(this.vertexDrawings).forEach(k => this.verticesLayer.add(
            this.vertexDrawings[k]));
        for (const s of Object.keys(this.edgeDrawings)) {
            for (const e of Object.keys(this.edgeDrawings[s])) {
                this.edgesLayer.add(this.edgeDrawings[s][e]);
            }
        }

        // Draw both layers (necessary for the added objects to actually be
        // visible)
        this.edgesLayer.draw();
        this.verticesLayer.draw();

        if (this.continuousLayoutTimer != undefined) {
            window.clearInterval(this.continuousLayoutTimer);
            this.continuousLayoutTimer = undefined;
        }
        if (layout != undefined && layout.isContinuous()) {
            this.continuousLayoutTimer = window.setInterval(() => {
                layout.updateVertexPositions(this.graph, this.positions);
                this.redrawGraph(layout);
            }, 40);
        }
    }

    layoutWithoutRender(layout: Layouts.Layout) {
        // edge drawigns must be populated AFTER vertex drawings
        // because edge drawings store a reference to their start
        // and end vertex drawings
        this.populateVertexDrawings(layout);
        this.populateEdgeDrawings();
        this.attachVertexEventHandlers();
    }

    // This is a "shallow" render, just update positions from the layout and
    // update the vertex and edge positions
    redrawGraph(layout: Layouts.Layout) {
        layout.updateVertexPositions(this.graph, this.positions);
        for (const v of Object.keys(this.positions)) {
            const drawing: VertexDrawing = this.vertexDrawings[v];
            drawing.x(this.positions[v].x);
            drawing.y(this.positions[v].y);
            drawing.callMoveCallbacks()
        }
        this.verticesLayer.draw();
        this.edgesLayer.draw();
    }

    setVertexRadius(radius: number) {
        this.vertexRadius = radius;
        Object.values(this.vertexDrawings).forEach(vd => vd.setRadius(radius));
        this.verticesLayer.draw();
    }

    populateVertexDrawings(layout: Layouts.Layout) {
        this.positions = layout.getVertexPositions(this.graph);
        this.vertexDrawings = {};
        for (const v of Object.keys(this.positions)) {
            const p = this.positions[v];
            this.centroidCache.xSum += p.x;
            this.centroidCache.ySum += p.y;
            this.vertexDrawings[v] = new VertexDrawing(p.x, p.y,
                this.vertexRadius, v.toString(), this, parseInt(v));
        }
    }

    attachVertexEventHandlers() {
        for (const v of Object.keys(this.vertexDrawings)) {
            this.vertexDrawings[v].addClickCallback(
                this.vertexClickHandler.bind(this));
            this.vertexDrawings[v].addDoubleClickCallback(
                this.vertexDoubleClickHandler.bind(this));
            this.vertexDrawings[v].addMoveCallback(
                this.vertexMoveHandler.bind(this));
        }
    }

    // Assume vertices already drawn
    populateEdgeDrawings() {
        const edges = this.graph.getEdgeList();
        this.edgeDrawings = {};
        for (const e of edges) {
            const start = this.vertexDrawings[e[0]];
            const end   = this.vertexDrawings[e[1]];
            if (!(e[0] in this.edgeDrawings)) {
                this.edgeDrawings[e[0]] = {};
            }
            this.edgeDrawings[e[0]][e[1]] = new EdgeDrawing(this, start, end,
                this.graph.isDirected(),
                this.edgesLayer.draw.bind(this.edgesLayer),
                this.graph instanceof Graphs.WeightedGraph ?
                    this.graph.getEdgeWeight(e[0], e[1]) : undefined,
                this.handleWeightUpdate.bind(this)
            );
        }
    }

    getWeightOffset(start: VertexDrawing, end: VertexDrawing): Vector2 {
        const centroidPt = Util.vectorToPoint(this.getCentroid());
        const startV: Vector2 = [start.x(), start.y()];
        const endV: Vector2 = [end.x(), end.y()];
        const centroidOnRight =
            (end.y() - start.y()) * (centroidPt.x - start.x()) >
            (centroidPt.y - start.y()) * (end.x() - start.x());
        const dirVec = Util.getDirectionVectorNormalized(startV, endV);
        const m = centroidOnRight ? -1 : 1;
        const orthDirVec: Vector2 = [dirVec[1] / m , -dirVec[0] / m];
        return Util.scalarVectorMultiply(15, orthDirVec);
    }

    addVertexToCurrentGraph(e: Konva.KonvaEventObject<MouseEvent>) {
        const [x, y] = getMouseEventXY(e);
        const newId = this.graph.addVertex();
        const drawing = new VertexDrawing(x, y, this.vertexRadius,
            newId.toString(), this, newId);
        this.vertexDrawings[newId] = drawing;
        this.positions[newId] = {x: x, y: y};
        drawing.addClickCallback(this.vertexClickHandler.bind(this));
        drawing.addDoubleClickCallback(
            this.vertexDoubleClickHandler.bind(this));
        this.verticesLayer.add(drawing);
        this.verticesLayer.draw();

        this.centroidCache.n += 1;
        this.centroidCache.xSum += x;
        this.centroidCache.ySum += y;
    }

    vertexMoveHandler(vertex: VertexDrawing) {
        const vid = vertex.getVertexId();
        this.centroidCache.xSum -= this.positions[vid].x;
        this.centroidCache.ySum -= this.positions[vid].y;

        this.positions[vid] = {x: vertex.x(), y: vertex.y()};

        this.centroidCache.xSum += this.positions[vid].x;
        this.centroidCache.ySum += this.positions[vid].y;

        // Notify neighbors so they can update their label positions
        for (const n of this.graph.getVertexNeighborIds(vid, true)) {
            this.vertexDrawings[n].updateExternalLabelPosition();
        }
    }

    vertexClickHandler(vertexDrawing: VertexDrawing) {
        if (this.selectedVertex) {
            this.selectedVertex.unselect();
            if (this.selectedVertex === vertexDrawing) {
                this.selectedVertex = null;
                return;
            }
            this.toggleEdge(this.selectedVertex, vertexDrawing);
            this.selectedVertex = null;
        } else {
            if (vertexDrawing.isSelected()) {
                vertexDrawing.unselect();
                this.selectedVertex = null;
            } else {
                vertexDrawing.select();
                this.selectedVertex = vertexDrawing;
            }
        }
        this.verticesLayer.draw();
    }

    vertexDoubleClickHandler(vertexDrawing: VertexDrawing) {
        if (vertexDrawing === this.selectedVertex) {
            // Unset the selected vertex if it is going to be deleted
            this.selectedVertex = null;
        }
        for (const edge of vertexDrawing.edgeDrawings) {
            edge.destroy();
        }
        // TODO remove edge drawing from this.edgeDrawings
        const vertexId = this.lookupVertexId(vertexDrawing)
        this.graph.removeVertex(vertexId);
        vertexDrawing.destroy();
        delete this.vertexDrawings[vertexId];
        delete this.positions[vertexId];
        this.verticesLayer.draw();
        this.edgesLayer.draw();

        this.centroidCache.n -= 1;
        this.centroidCache.xSum -= vertexDrawing.x();
        this.centroidCache.ySum -= vertexDrawing.y();
    }

    lookupVertexId(vertexDrawing: VertexDrawing): number {
        const m = this.vertexDrawings;
        return parseInt(Object.keys(m).find(key => m[key] === vertexDrawing));
    }

    toggleEdge(start: VertexDrawing, end: VertexDrawing) {
        const startId = this.lookupVertexId(start);
        const endId = this.lookupVertexId(end);
        for (const edgeDrawing of start.edgeDrawings) {
            const endIndex = end.edgeDrawings.indexOf(edgeDrawing);
            if (endIndex >= 0) {
                start.unregisterEdgeDrawing(edgeDrawing);
                end.unregisterEdgeDrawing(edgeDrawing);
                edgeDrawing.destroy();
                this.edgesLayer.draw();
                delete this.edgeDrawings[startId][endId];
                this.graph.removeEdge(startId, endId);
                return;
            }
        }
        const edgeDrawing = new EdgeDrawing(this, start, end,
            this.graph.isDirected(),
            this.edgesLayer.draw.bind(this.edgesLayer),
            this.graph instanceof Graphs.WeightedGraph ? 0 : undefined,
            this.handleWeightUpdate.bind(this)
        );
        this.graph.addEdge(startId, endId);
        // The order is important because graph.getEdgeList() returns only
        // (m,n) edges where m < n. We conform to that here.
        if (startId < endId) {
            if (!(startId in this.edgeDrawings)) {
                this.edgeDrawings[startId] = {};
            }
            this.edgeDrawings[startId][endId] = edgeDrawing;
        } else {
            if (!(endId in this.edgeDrawings)) {
                this.edgeDrawings[endId] = {};
            }
            this.edgeDrawings[endId][startId] = edgeDrawing;
        }
        this.edgesLayer.add(edgeDrawing);
        this.edgesLayer.draw();
    }

    toJsonString(): string {
        const positions: Layouts.PositionMap = {};
        for (const v of Object.keys(this.vertexDrawings)) {
            positions[v] = {x: this.vertexDrawings[v].x(),
                y: this.vertexDrawings[v].y()
            };
        }
        const edges = this.graph.getEdgeList();
        const curvePointPositions: {[v1: number]: {[v2: number]: Vector2}} = {};
        for (const edge of edges) {
            const edgeDrawing = this.edgeDrawings[edge[0]][edge[1]];
            if (!(edge[0] in curvePointPositions)) {
                curvePointPositions[edge[0]] = {};
            }
            curvePointPositions[edge[0]][edge[1]] = edgeDrawing.getCurvePointPosition();
        }
        return JSON.stringify({
            graph: this.graph,
            vertexPositions: positions,
            curvePointPositions: curvePointPositions
        });
    }

    static fromJsonString(jsonStr: string): GraphDrawing {
        const data: {
            graph: string,
            vertexPositions: Layouts.PositionMap,
            curvePointPositions: {[v1: number]: {[v2: number]: Vector2}}
        } = JSON.parse(jsonStr);
        const gd = new GraphDrawing(Graphs.fromJsonObject(data.graph));
        const layout = new Layouts.FixedLayout(data.vertexPositions);
        gd.layoutWithoutRender(layout);
        const edgeList = gd.graph.getEdgeList();
        for (const edge of edgeList) {
            const ed = gd.getEdgeDrawing(edge[0], edge[1]);
            const curvePointPosition = data.curvePointPositions[edge[0]][edge[1]];
            if (curvePointPosition != undefined) {
                ed.setCurvePointPosition(curvePointPosition);
            }
        }
        return gd;
    }

    detachStage() {
        if (this.continuousLayoutTimer != undefined) {
            window.clearInterval(this.continuousLayoutTimer);
            this.continuousLayoutTimer = undefined;
        }
        this.stage.off('click');
    }

    getEdgeDrawing(startVertexId: number, endVertexId: number): EdgeDrawing {
        return this.edgeDrawings[startVertexId]?.[endVertexId];
    }

    getCentroid(): Vector2 {
        const n = this.centroidCache.n;
        return [this.centroidCache.xSum / n, this.centroidCache.ySum / n];;
    }

    handleWeightUpdate(start: VertexDrawing, end: VertexDrawing, weight: number) {
        let startId = this.lookupVertexId(start);
        let endId = this.lookupVertexId(end);
        //if (!this.graph.isDirected() && startId > endId) {
            //let t = endId;
            //endId = startId;
            //startId = t;
        //}
        if (this.graph instanceof Graphs.WeightedGraph) {
            this.graph.setEdgeWeight(startId, endId, weight);
        }
    }

    getGraph(): Graphs.Graph {
        return this.graph;
    }

    getDecorator(): Decorator {
        return new GraphDrawing.DefaultDecorator(this);
    }

    getVertexPositions(): Layouts.PositionMap {
        return this.positions;
    }

    getVertexDrawings() {
        return this.vertexDrawings;
    }

    getStage(): Konva.Stage {
        return this.stage;
    }

    private getEdgeDrawingOrder(aVertexId: number, bVertexId: number):
            [number, number] {
        if (bVertexId in this.edgeDrawings &&
            aVertexId in this.edgeDrawings[bVertexId]) {
            return [bVertexId, aVertexId];
        } else if (aVertexId in this.edgeDrawings &&
            bVertexId in this.edgeDrawings[aVertexId]) {
            return [aVertexId, bVertexId];
        } else {
            return null;
        }
    }

    static DefaultDecorator = class implements Decorator {
        drawing: GraphDrawing;

        constructor(graphDrawing: GraphDrawing) {
            this.drawing = graphDrawing;
        }

        getGraph(): Graphs.Graph {
            return this.drawing.graph;
        }

        getVertexState(vertexId: number): DecorationState {
            return this.drawing.vertexDrawings[vertexId].getDecorationState();
        }

        setVertexState(vertexId: number, state: DecorationState) {
            this.drawing.vertexDrawings[vertexId].setDecorationState(state);
            this.drawing.vertexDrawings[vertexId].draw();
        }

        getEdgeState(startVertexId: number, endVertexId: number): DecorationState {
            if (!this.drawing.graph.isDirected()) {
                [startVertexId, endVertexId] = this.drawing.getEdgeDrawingOrder(
                    startVertexId, endVertexId);
            }
            return this.drawing.edgeDrawings[startVertexId][endVertexId].getDecorationState();
        }

        setEdgeState(startVertexId: number, endVertexId: number,
                     state: DecorationState) {
            if (!this.drawing.graph.isDirected()) {
                [startVertexId, endVertexId] = this.drawing.getEdgeDrawingOrder(
                    startVertexId, endVertexId);
            }
            const edge = this.drawing.edgeDrawings[startVertexId][endVertexId];
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
            for (const vertex of this.drawing.graph.getVertexIds()) {
                this.setVertexState(vertex, "default");
                this.drawing.getVertexDrawings()[vertex].clearExternalLabel();
            }
            for (const edge of this.drawing.graph.getEdgeList()) {
                this.setEdgeState(edge[0], edge[1], "default");
            }
        }
    }
}
