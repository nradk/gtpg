import Konva from "konva";

import Graph from "./graph";
import { MouseEventCallback, RedrawCallback } from "./commontypes";
import * as Layouts from "./layouts";

type VertexDrawingEventCallback = (v: VertexDrawing) => void;

export class VertexDrawing extends Konva.Group {

    selected: boolean;
    label: Konva.Text;
    circle: Konva.Circle;
    moveCallbacks: MouseEventCallback[];
    clickCallbacks: VertexDrawingEventCallback[];
    doubleClickCallbacks: VertexDrawingEventCallback[];
    edgeDrawings: EdgeDrawing[];
    labelX: number;

    constructor(x: number, y: number, labelText: string) {
        super({ x: x, y: y, draggable: true });
        this.circle = new Konva.Circle({ radius: 15,
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
        const dragHandler = (e: Konva.KonvaEventObject<MouseEvent>) => {
            this.moveCallbacks.forEach(callback => callback(e));
        };
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

    addMoveCallBack(callback: MouseEventCallback) {
        this.moveCallbacks.push(callback);
    }

    removeMoveCallback(callback: MouseEventCallback) {
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

export class EdgeDrawing extends Konva.Line {
    start: VertexDrawing;
    end: VertexDrawing;
    redrawCallback: RedrawCallback;

    // Third argument is supposed to be 'directed'
    constructor(start: VertexDrawing, end: VertexDrawing, _: boolean,
                redrawCallback: RedrawCallback) {
        super({
            points: [start.x(), start.y(),
                end.x(), end.y()],
            stroke: 'black',
            strokeWidth: 2,
            lineCap: 'round',
            lineJoin: 'round'
        });
        this.start = start;
        this.end = end;
        this.redrawCallback = redrawCallback;
        this.start.addMoveCallBack(this.vertexMoveCallback.bind(this));
        this.end.addMoveCallBack(this.vertexMoveCallback.bind(this));
        this.start.registerEdgeDrawing(this);
        this.end.registerEdgeDrawing(this);
    }

    vertexMoveCallback(_: Konva.KonvaEventObject<MouseEvent>) {
        this.points([this.start.x(), this.start.y(),
            this.end.x(), this.end.y()]);
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

    constructor(stage: Konva.Stage, graph?: Graph) {
        if (graph === undefined) {
            this.graph = new Graph();
        } else {
            this.graph = graph;
        }
        this.stage = stage;
        this.vertexDrawings = [];
        this.verticesLayer = new Konva.Layer();
            this.edgesLayer = new Konva.Layer();
        this.stage.add(this.edgesLayer).add(this.verticesLayer);
        this.stage.on('click', this.addVertexToCurrentGraph.bind(this));
    }

    renderGraph(layoutName: Layouts.LayoutName) {
        this.stage.clear();
        this.verticesLayer.destroyChildren();
        this.edgesLayer.destroyChildren();

        this.layout = Layouts.getLayoutForStageDims(layoutName, {
            width: this.stage.width(),
            height: this.stage.height()
        });
        this.populateVertexDrawings();
        this.attachVertexEventHandlers();
        Object.keys(this.vertexDrawings).forEach(k => this.verticesLayer.add(
            this.vertexDrawings[k]));
        const edgeDrawings = this.createEdgeDrawings();
        edgeDrawings.forEach(ed => this.edgesLayer.add(ed));
        this.edgesLayer.draw();
        this.verticesLayer.draw();
    }

    populateVertexDrawings() {
        const vertexPositions = this.layout.getVertexPositions(this.graph);
        this.vertexDrawings = {};
        for (const v of Object.keys(vertexPositions)) {
            const p = vertexPositions[v];
            this.vertexDrawings[v] = new VertexDrawing(p.x, p.y, v.toString());
        }
    }

    attachVertexEventHandlers() {
        for (const v of Object.keys(this.vertexDrawings)) {
            this.vertexDrawings[v].addClickCallback(
                this.vertexClickHandler.bind(this));
            this.vertexDrawings[v].addDoubleClickCallback(
                this.vertexDoubleClickHandler.bind(this));
        }
    }

    // Assume vertices already drawn
    createEdgeDrawings(): EdgeDrawing[] {
        const edges = this.graph.getEdgeList();
        const edgeDrawings: EdgeDrawing[] = [];
        for (const e of edges) {
            const start = this.vertexDrawings[e[0]];
            const end   = this.vertexDrawings[e[1]];
            edgeDrawings.push(new EdgeDrawing(start, end, false,
                              this.edgesLayer.draw.bind(this.edgesLayer)));
        }
        return edgeDrawings;
    }

    addVertexToCurrentGraph(e: Konva.KonvaEventObject<MouseEvent>) {
        console.trace();
        const absolutePosition = e.target.getAbsolutePosition();
        const x = e.evt.offsetX - absolutePosition.x;
        const y = e.evt.offsetY - absolutePosition.y;
        const newId = this.graph.addVertex();
        const drawing = new VertexDrawing(x, y, newId.toString());
        this.vertexDrawings[newId] = drawing;
        drawing.addClickCallback(this.vertexClickHandler.bind(this));
        drawing.addDoubleClickCallback(
            this.vertexDoubleClickHandler.bind(this));
        this.verticesLayer.add(drawing);
        this.verticesLayer.draw();
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
        const edgeDrawing = new EdgeDrawing(start, end, false,
                                this.edgesLayer.draw.bind(this.edgesLayer));
        this.graph.addEdge(startId, endId);
        this.edgesLayer.add(edgeDrawing);
        this.edgesLayer.draw();
    }
}
