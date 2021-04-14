import Konva from "konva";

import Graph from "./graph";
import { RedrawCallback } from "./commontypes";
import * as Layouts from "./layouts";

type VertexDrawingEventCallback = (v: VertexDrawing) => void;

export class VertexDrawing extends Konva.Group {

    selected: boolean;
    label: Konva.Text;
    circle: Konva.Circle;
    moveCallbacks: VertexDrawingEventCallback[];
    clickCallbacks: VertexDrawingEventCallback[];
    doubleClickCallbacks: VertexDrawingEventCallback[];
    edgeDrawings: EdgeDrawing[];

    constructor(x: number, y: number, labelText: string) {
        super({ x: x, y: y, draggable: true });
        this.circle = new Konva.Circle({
            radius: 15,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 2
        });
        this.add(this.circle);
        this.selected = false;
        this.moveCallbacks = [];
        this.moveCallbacks = [];
        this.clickCallbacks = [];
        this.doubleClickCallbacks = [];
        this.edgeDrawings = [];
        this.label = new Konva.Text({
            text: labelText,
            fontSize: 18,
            fill: 'black'
        });
        this.label.offsetX(this.label.width() / 2);
        this.label.offsetY(this.label.height() / 2);
        this.add(this.label);
        const mouseOverHandler = function () {
            document.body.style.cursor = 'pointer';
        };
        const mouseOutHandler = function () {
            document.body.style.cursor = 'default';
        };
        const dragHandler = (_: Konva.KonvaEventObject<MouseEvent>) =>
            this.callMoveCallbacks();
        this.on('mouseover', mouseOverHandler);
        this.on('mouseout', mouseOutHandler);
        this.on('dragmove', dragHandler);
        const clickHandler = (e: Konva.KonvaEventObject<MouseEvent>) => {
            this.clickCallbacks.forEach(callback => callback(this));
            e.cancelBubble = true;
        };
        this.on('click', clickHandler);
        const doubleClickHandler = (e: Konva.KonvaEventObject<MouseEvent>) => {
            this.doubleClickCallbacks.forEach(callback => callback(this));
            e.cancelBubble = true;
        };
        this.on('dblclick', doubleClickHandler);
    }

    getRadius(): number{
        return this.circle.radius();
    }

    select() {
        if (!this.selected) {
            this.circle.stroke('red');
            this.circle.strokeWidth(4);
            this.label.fill('red');
            this.selected = !this.selected;
        }
    }

    unselect() {
        if (this.selected) {
            this.circle.stroke('black');
            this.circle.strokeWidth(2);
            this.label.fill('black');
            this.selected = !this.selected;
        }
    }

    addMoveCallback(callback: VertexDrawingEventCallback) {
        this.moveCallbacks.push(callback);
    }

    callMoveCallbacks() {
        this.moveCallbacks.forEach(callback => callback(this));
    }

    removeMoveCallback(callback: VertexDrawingEventCallback) {
        const idx = this.moveCallbacks.indexOf(callback);
        if (idx >= 0) {
            this.moveCallbacks.splice(idx, 1);
        }
    }

    addClickCallback(callback: VertexDrawingEventCallback) {
        this.clickCallbacks.push(callback);
    }

    removeClickCallback(callback: VertexDrawingEventCallback) {
        const idx = this.clickCallbacks.indexOf(callback);
        if (idx >= 0) {
            this.clickCallbacks.splice(idx, 1);
        }
    }

    addDoubleClickCallback(callback: VertexDrawingEventCallback) {
        this.doubleClickCallbacks.push(callback);
    }

    removeDoubleClickCallback(callback: VertexDrawingEventCallback) {
        const idx = this.doubleClickCallbacks.indexOf(callback);
        if (idx >= 0) {
            this.doubleClickCallbacks.splice(idx, 1);
        }
    }

    registerEdgeDrawing(edgeDrawing: EdgeDrawing) {
        this.edgeDrawings.push(edgeDrawing);
    }

    unregisterEdgeDrawing(edgeDrawing: EdgeDrawing) {
        const idx = this.edgeDrawings.indexOf(edgeDrawing);
        if (idx >= 0) {
            this.edgeDrawings.splice(idx, 1);
        }
    }
}

export class EdgeDrawing extends Konva.Arrow {
    start: VertexDrawing;
    end: VertexDrawing;
    directed: boolean;
    redrawCallback: RedrawCallback;

    // Third argument is supposed to be 'directed'
    constructor(start: VertexDrawing, end: VertexDrawing, directed: boolean,
                redrawCallback: RedrawCallback) {
        super({
            points: [start.x(), start.y(),
                end.x(), end.y()],
            stroke: 'black',
            fill: 'black',
            strokeWidth: 2,
            lineCap: 'round',
            lineJoin: 'round',
            pointerLength: directed? 10 : 0,
            pointerWidth: directed? 10 : 0,

        });
        this.start = start;
        this.end = end;
        this.directed = directed;
        this.redrawCallback = redrawCallback;
        this.start.addMoveCallback(this.vertexMoveCallback.bind(this));
        this.end.addMoveCallback(this.vertexMoveCallback.bind(this));
        this.start.registerEdgeDrawing(this);
        this.end.registerEdgeDrawing(this);
        this.setEdgePoints();
    }

    setEdgePoints() {
        const start = this.start;
        const end = this.end;
        // Compute and set end point (the point where the edge touches the
        // destination vertex's circle). Skip this computation if graph isn't
        // directed.
        if (this.directed) {
            let toStart = [start.x() - end.x(), start.y() - end.y()];
            const magnitude = Math.sqrt(toStart[0] * toStart[0] +
                toStart[1] * toStart[1]);
            toStart = [toStart[0] / magnitude, toStart[1] / magnitude];
            const r = end.getRadius();
            const endPoint = [end.x() + r*toStart[0], end.y() + r*toStart[1]];
            this.points([start.x(), start.y()].concat(endPoint));
        } else {
            this.points([start.x(), start.y(), end.x(), end.y()]);
        }
    }

    vertexMoveCallback(_: VertexDrawing) {
        this.setEdgePoints();
        this.redrawCallback();
    }
}


export class GraphDrawing {
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
        const absolutePosition = e.target.getAbsolutePosition();
        const x = e.evt.offsetX - absolutePosition.x;
        const y = e.evt.offsetY - absolutePosition.y;
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
