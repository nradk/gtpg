import Konva from "konva";

import VertexDrawing from "./vertexdrawing";
import EdgeDrawing from "./edgedrawing";
import Graph from "../graph_core/graph";
import * as Layouts from "../drawing/layouts";
import { getMouseEventXY } from "./util";
import { Vector2 } from "../commontypes";

export default class GraphDrawing {
    vertexDrawings : {[id: number]: VertexDrawing};
    edgeDrawings : EdgeDrawing[];
    graph : Graph;
    selectedVertex : VertexDrawing;
    stage : Konva.Stage;
    verticesLayer : Konva.Layer;
    edgesLayer : Konva.Layer;
    continuousLayoutTimer: number;
    positions: Layouts.PositionMap;

    constructor(graph?: Graph) {
        if (graph === undefined) {
            this.graph = new Graph(false);
        } else {
            this.graph = graph;
        }
        this.vertexDrawings = [];
        this.positions = {};
        this.verticesLayer = new Konva.Layer();
        this.edgesLayer = new Konva.Layer();
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
        this.edgeDrawings.forEach(ed => this.edgesLayer.add(ed));

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

    populateVertexDrawings(layout: Layouts.Layout) {
        this.positions = layout.getVertexPositions(this.graph);
        this.vertexDrawings = {};
        for (const v of Object.keys(this.positions)) {
            const p = this.positions[v];
            this.vertexDrawings[v] = new VertexDrawing(p.x, p.y, v.toString());
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
        this.edgeDrawings = [];
        for (const e of edges) {
            const start = this.vertexDrawings[e[0]];
            const end   = this.vertexDrawings[e[1]];
            this.edgeDrawings.push(new EdgeDrawing(start, end,
                this.graph.isDirected(),
                this.edgesLayer.draw.bind(this.edgesLayer)));
        }
    }

    addVertexToCurrentGraph(e: Konva.KonvaEventObject<MouseEvent>) {
        const [x, y] = getMouseEventXY(e);
        const newId = this.graph.addVertex();
        const drawing = new VertexDrawing(x, y, newId.toString());
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
        for (const edgeDrawing of start.edgeDrawings) {
            const endIndex = end.edgeDrawings.indexOf(edgeDrawing);
            if (endIndex >= 0) {
                start.unregisterEdgeDrawing(edgeDrawing);
                end.unregisterEdgeDrawing(edgeDrawing);
                edgeDrawing.destroy();
                this.edgesLayer.draw();
                this.graph.removeEdge(startId, endId);
                return;
            }
        }
        const edgeDrawing = new EdgeDrawing(start, end,
                                this.graph.isDirected(),
                                this.edgesLayer.draw.bind(this.edgesLayer));
        this.graph.addEdge(startId, endId);
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
        for (let i = 0; i < edges.length; i++) {
            // TODO this depends on the fact that this.edgeDrawings is created
            // by iterating through this.graph.getEdgeList() in order. Remove
            // that dependence.
            const edge = edges[i];
            const edgeDrawing = this.edgeDrawings[i];
            if (!(edge[0] in curvePointPositions)) {
                curvePointPositions[edge[0]] = {};
            }
            curvePointPositions[edge[0]][edge[1]] = edgeDrawing.getCurvePointPosition();
        }
        return JSON.stringify({
            graph: this.graph.toJsonString(),
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
        const gd = new GraphDrawing(Graph.fromJsonString(data.graph));
        const layout = new Layouts.FixedLayout(data.vertexPositions);
        gd.populateVertexDrawings(layout);
        gd.populateEdgeDrawings();
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
        // TODO store egeDrawings in 2D array to avoid extra overhead here
        for (const edgeDrawing of this.edgeDrawings) {
            const o = this.vertexDrawings;
            const startId = parseInt(Object.keys(o).find(key => o[key] == edgeDrawing.start));
            const endId   = parseInt(Object.keys(o).find(key => o[key] == edgeDrawing.end));
            if (startId == startVertexId && endId === endVertexId) {
                return edgeDrawing;
            }
        }
        return undefined;
    }
}
