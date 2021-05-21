import Konva from "konva";

import VertexDrawing from "./vertexdrawing";
import EdgeDrawing from "./edgedrawing";
import * as Graphs from "../graph_core/graph";
import * as Layouts from "../drawing/layouts";
import { getMouseEventXY } from "./util";
import { Vector2,  Util } from "../commontypes";

export default class GraphDrawing {
    vertexDrawings : {[id: number]: VertexDrawing};
    edgeDrawings : {[start: number]: { [end: number]: EdgeDrawing }};
    graph : Graphs.Graph;
    selectedVertex : VertexDrawing;
    stage : Konva.Stage;
    verticesLayer : Konva.Layer;
    edgesLayer : Konva.Layer;
    continuousLayoutTimer: number;
    positions: Layouts.PositionMap;
    vertexRadius: number;

    constructor(graph?: Graphs.Graph) {
        if (graph === undefined) {
            this.graph = new Graphs.UnweightedGraph(false);
        } else {
            this.graph = graph;
        }
        this.vertexDrawings = [];
        this.positions = {};
        this.verticesLayer = new Konva.Layer();
        this.edgesLayer = new Konva.Layer();
        this.vertexRadius = 15;
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
            this.vertexDrawings[v] = new VertexDrawing(p.x, p.y,
                this.vertexRadius, v.toString());
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
        this.edgeDrawings = {}
        for (const e of edges) {
            const start = this.vertexDrawings[e[0]];
            const end   = this.vertexDrawings[e[1]];
            if (!(e[0] in this.edgeDrawings)) {
                this.edgeDrawings[e[0]] = {};
            }
            this.edgeDrawings[e[0]][e[1]] = new EdgeDrawing(start, end,
                this.graph.isDirected(),
                this.edgesLayer.draw.bind(this.edgesLayer),
                this.graph instanceof Graphs.WeightedGraph ?
                    this.graph.getEdgeWeight(e[0], e[1]) : undefined,
                this.graph instanceof Graphs.WeightedGraph ?
                    this.getWeightOffset(start, end) : undefined,
                this.handleWeightUpdate.bind(this)
            );
        }
    }

    private getWeightOffset(start: VertexDrawing, end: VertexDrawing): Vector2 {
        const centroid = this.getCentroid();
        const edgeCenter: Vector2 = [(start.x() + end.x()) / 2,
            (end.y() + start.y()) / 2];
        const offset = Util.getNormalized(Util.getDirectionVector(centroid,
            edgeCenter));
        return Util.scalarVectorMultiply(15, offset);
    }

    addVertexToCurrentGraph(e: Konva.KonvaEventObject<MouseEvent>) {
        const [x, y] = getMouseEventXY(e);
        const newId = this.graph.addVertex();
        const drawing = new VertexDrawing(x, y, this.vertexRadius,
            newId.toString());
        this.vertexDrawings[newId] = drawing;
        this.positions[newId] = {x: x, y: y};
        drawing.addClickCallback(this.vertexClickHandler.bind(this));
        drawing.addDoubleClickCallback(
            this.vertexDoubleClickHandler.bind(this));
        this.verticesLayer.add(drawing);
        this.verticesLayer.draw();
    }

    vertexMoveHandler(vertex: VertexDrawing) {
        const vid = this.lookupVertexId(vertex);
        this.positions[vid] = {x: vertex.x(), y: vertex.y()};
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
            if (vertexDrawing.selected) {
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
    }

    lookupVertexId(vertexDrawing: VertexDrawing): number {
        const m = this.vertexDrawings;
        return parseInt(Object.keys(m).find(key => m[key] === vertexDrawing));
    }

    toggleEdge(start: VertexDrawing, end: VertexDrawing) {
        const startId = this.lookupVertexId(start);
        const endId = this.lookupVertexId(end);
        console.log("Toggling", startId, endId);
        for (const edgeDrawing of start.edgeDrawings) {
            const endIndex = end.edgeDrawings.indexOf(edgeDrawing);
            if (endIndex >= 0) {
                start.unregisterEdgeDrawing(edgeDrawing);
                end.unregisterEdgeDrawing(edgeDrawing);
                edgeDrawing.destroy();
                this.edgesLayer.draw();
                delete this.edgeDrawings[startId][endId];
                this.graph.removeEdge(startId, endId);
                console.log("Removed edge", this.edgeDrawings);
                return;
            }
        }
        const edgeDrawing = new EdgeDrawing(start, end,
            this.graph.isDirected(),
            this.edgesLayer.draw.bind(this.edgesLayer),
            this.graph instanceof Graphs.WeightedGraph ? 0 : undefined,
            this.graph instanceof Graphs.WeightedGraph ?
                this.getWeightOffset(start, end) : undefined,
            this.handleWeightUpdate.bind(this)
        );
        this.graph.addEdge(startId, endId);
        if (!(startId in this.edgeDrawings)) {
            this.edgeDrawings[startId] = {};
        }
        this.edgeDrawings[startId][endId] = edgeDrawing;
        this.edgesLayer.add(edgeDrawing);
        this.edgesLayer.draw();
        console.log("Added edge", this.edgeDrawings);
    }

    toJsonString(): string {
        const positions: Layouts.PositionMap = {};
        for (const v of Object.keys(this.vertexDrawings)) {
            positions[v] = {x: this.vertexDrawings[v].x(),
                y: this.vertexDrawings[v].y()
            };
        }
        const edges = this.graph.getEdgeList();
        console.log(edges);
        console.log(this.edgeDrawings);
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
        let x = 0, y = 0;
        for (const v of Object.values(this.vertexDrawings)) {
            x += v.x();
            y += v.y();
        }
        const n = Object.values(this.vertexDrawings).length;
        const centroid: Vector2 = [ x / n, y / n ];
        return centroid;
    }

    handleWeightUpdate(start: VertexDrawing, end: VertexDrawing, weight: number) {
        const startId = this.lookupVertexId(start);
        const endId = this.lookupVertexId(end);
        if (this.graph instanceof Graphs.WeightedGraph) {
            this.graph.setEdgeWeight(startId, endId, weight);
        }
    }
}
