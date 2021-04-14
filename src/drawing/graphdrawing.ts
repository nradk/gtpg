import Konva from "konva";

import VertexDrawing from "./vertexdrawing";
import EdgeDrawing from "./edgedrawing";
import Graph from "../graph";
import * as Layouts from "../layouts";
import { getMouseEventXY } from "./util";

export default class GraphDrawing {
    vertexDrawings : {[id: number]: VertexDrawing};
    edgeDrawings : EdgeDrawing[];
    graph : Graph;
    selectedVertex : VertexDrawing;
    stage : Konva.Stage;
    verticesLayer : Konva.Layer;
    edgesLayer : Konva.Layer;
    layout : Layouts.Layout;
    continuousLayoutTimer: number;
    positions: Layouts.PositionMap;

    constructor(initialLayout: Layouts.Layout, graph?: Graph) {
        if (graph === undefined) {
            this.graph = new Graph(false);
        } else {
            this.graph = graph;
        }
        this.layout = initialLayout;
        this.vertexDrawings = [];
        this.positions = {};
        this.verticesLayer = new Konva.Layer();
        this.edgesLayer = new Konva.Layer();
    }

    setStage(stage: Konva.Stage): void {
        this.stage = stage;
        this.stage.destroyChildren();
        this.stage.add(this.edgesLayer).add(this.verticesLayer);
        this.stage.on('click', this.addVertexToCurrentGraph.bind(this));
    }

    renderGraph(layout?: Layouts.Layout) {
        if (!this.stage) {
            throw Error("Stage needs to be set before call to renderGraph()");
        }

        this.edgesLayer.destroyChildren();
        this.verticesLayer.destroyChildren();
        if (layout != undefined) {
            this.layout = layout;
        }

        this.populateVertexDrawings();
        this.attachVertexEventHandlers();
        Object.keys(this.vertexDrawings).forEach(k => this.verticesLayer.add(
            this.vertexDrawings[k]));
        const edgeDrawings = this.createEdgeDrawings();
        edgeDrawings.forEach(ed => this.edgesLayer.add(ed));
        this.edgesLayer.draw();
        this.verticesLayer.draw();

        // After drawing the graph, 'fix' the layout
        this.layout = new Layouts.FixedLayout(this.positions);

        if (this.continuousLayoutTimer != undefined) {
            window.clearInterval(this.continuousLayoutTimer);
            this.continuousLayoutTimer = undefined;
        }
        if (layout != undefined && layout.isContinuous()) {
            this.continuousLayoutTimer = window.setInterval(() => {
                layout.updateVertexPositions(this.graph, this.positions);
                this.redrawGraph();
            }, 40);
        }
    }

    // This is a "shallow" render, just update positions from the layout and
    // update the vertex and edge positions
    redrawGraph() {
        this.layout.updateVertexPositions(this.graph, this.positions);
        for (const v of Object.keys(this.positions)) {
            const drawing: VertexDrawing = this.vertexDrawings[v];
            drawing.x(this.positions[v].x);
            drawing.y(this.positions[v].y);
            drawing.callMoveCallbacks()
        }
        this.verticesLayer.draw();
        this.edgesLayer.draw();
    }

    populateVertexDrawings() {
        this.positions = this.layout.getVertexPositions(this.graph);
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
    createEdgeDrawings(): EdgeDrawing[] {
        const edges = this.graph.getEdgeList();
        const edgeDrawings: EdgeDrawing[] = [];
        for (const e of edges) {
            const start = this.vertexDrawings[e[0]];
            const end   = this.vertexDrawings[e[1]];
            edgeDrawings.push(new EdgeDrawing(start, end,
                this.graph.isDirected(),
                this.edgesLayer.draw.bind(this.edgesLayer)));
        }
        return edgeDrawings;
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

    setLayoutFromLayoutName(layoutName: Layouts.LayoutName): void {
        this.layout = Layouts.getLayoutForStageDims(layoutName, {
            width: this.stage.width(),
            height: this.stage.height(),
        });
    }

    toJsonString(): string {
        const positions: Layouts.PositionMap = {};
        for (const v of Object.keys(this.vertexDrawings)) {
            positions[v] = {x: this.vertexDrawings[v].x(),
                y: this.vertexDrawings[v].y()
            };
        }
        return JSON.stringify({
            graph: this.graph.toJsonString(),
            positions: positions
        });
    }

    static fromJsonString(jsonStr: string): GraphDrawing {
        const data: {graph: string, positions: Layouts.PositionMap} =
            JSON.parse(jsonStr);
        const gd = new GraphDrawing(new Layouts.FixedLayout(data.positions),
                                    Graph.fromJsonString(data.graph));
        return gd;
    }

    detachStage() {
        if (this.continuousLayoutTimer != undefined) {
            window.clearInterval(this.continuousLayoutTimer);
            this.continuousLayoutTimer = undefined;
        }
        this.stage.off('click');
    }
}
