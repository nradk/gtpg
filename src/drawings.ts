import Konva from "konva";

import Graph from "./graph";
import { Point, MouseEventCallback, Layout } from "./commontypes";

type VertexDrawingEventCallback = (v: VertexDrawing) => void;

export class VertexDrawing extends Konva.Circle {

    selected: boolean;
    layer: Konva.Layer;
    moveCallbacks: MouseEventCallback[];
    clickCallbacks: VertexDrawingEventCallback[];
    doubleClickCallbacks: VertexDrawingEventCallback[];
    edgeDrawings: EdgeDrawing[];
    center: Point;

    constructor(x: number, y: number, layer: Konva.Layer) {
        super({
            x: x,
            y: y,
            radius: 15,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 2,
            draggable: true,
        })
        this.selected = false;
        this.layer = layer;
        this.moveCallbacks = [];
        this.clickCallbacks = [];
        this.doubleClickCallbacks = [];
        this.edgeDrawings = [];
        this.center = {x: x, y: y};
        this.on('mouseover', function () {
            document.body.style.cursor = 'pointer';
        });
        this.on('mouseout', function () {
            document.body.style.cursor = 'default';
        });
        this.on('dragmove', function (e) {
            this.center.x = this.x();
            this.center.y = this.y();
            this.moveCallbacks.forEach(callback => callback(e));
        });
        this.on('click', e => {
            this.clickCallbacks.forEach(callback => callback(this));
            e.cancelBubble = true;
        });
        this.on('dblclick', (e) => {
            this.doubleClickCallbacks.forEach(callback => callback(this));
            e.cancelBubble = true;
        });
    }

    select() {
        if (!this.selected) {
            this.stroke('red');
            this.strokeWidth(4);
            this.selected = !this.selected;
        }
    }

    unselect() {
        if (this.selected) {
            this.stroke('black');
            this.strokeWidth(2);
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
    layer: Konva.Layer;

    // Third argument is supposed to be 'directed'
    constructor(start: VertexDrawing, end: VertexDrawing, _: boolean,
        layer: Konva.Layer) {
        super({
            points: [start.center.x, start.center.y,
                end.center.x, end.center.y],
            stroke: 'black',
            strokeWidth: 2,
            lineCap: 'round',
            lineJoin: 'round'
        });
        this.start = start;
        this.end = end;
        this.layer = layer;
        this.start.addMoveCallBack(this.vertexMoveCallback.bind(this));
        this.end.addMoveCallBack(this.vertexMoveCallback.bind(this));
        this.start.registerEdgeDrawing(this);
        this.end.registerEdgeDrawing(this);
    }

    vertexMoveCallback(_: Konva.KonvaEventObject<MouseEvent>) {
        this.points([this.start.center.x, this.start.center.y,
            this.end.center.x, this.end.center.y]);
        this.layer.draw();
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

    constructor(stage: Konva.Stage, graph?: Graph) {
        if (graph === undefined) {
            this.graph = new Graph();
        } else {
            this.graph = graph;
        }
        this.stage = stage;
        this.vertexDrawings = [];
    }

    renderGraph(layout: Layout) {
        this.stage.clear();
        // TODO Is this necessary here?
        this.stage.destroyChildren();
        if (this.verticesLayer === undefined) {
            this.verticesLayer = new Konva.Layer();
        }
        if (this.edgesLayer === undefined) {
            this.edgesLayer = new Konva.Layer();
        }
        this.verticesLayer.destroyChildren();
        this.edgesLayer.destroyChildren();

        this.drawGraph(layout);
        this.stage.add(this.edgesLayer).add(this.verticesLayer);

        this.stage.on('click', this.addVertexToCurrentGraph.bind(this));
    }

    drawGraph(layout: Layout) {
        const vertexDrawings = this.getVertexDrawingsForLayout(layout);
        const edges = this.graph.getEdgeList();
        Object.values(vertexDrawings).forEach(vd => this.verticesLayer.add(vd));

        for (const e of edges) {
            const start = vertexDrawings[e[0]];
            const end   = vertexDrawings[e[1]];
            // Assume undirected (third argument)
            const edgeDrawing = new EdgeDrawing(start, end, false,
                this.edgesLayer);
            this.edgesLayer.add(edgeDrawing);
        }
    }

    getVertexDrawingsForLayout(layout: Layout) {
        const vertexDrawings: {[id: number]: VertexDrawing} = {};
        if (layout == "random") {
            for (const v of this.graph.getVertexIds()) {
                const x = Math.random() * this.stage.width();
                const y = Math.random() * this.stage.height();
                vertexDrawings[v] =  new VertexDrawing(x, y,
                    this.verticesLayer);
                vertexDrawings[v].addClickCallback(
                    this.vertexClickHandler.bind(this));
                vertexDrawings[v].addDoubleClickCallback(
                    this.vertexDoubleClickHandler.bind(this));
            }
        } else if (layout == "circular") {
            const centerX = this.stage.width() / 2;
            const centerY = this.stage.height() / 2;
            const radius = Math.floor(0.8 * Math.min(this.stage.height(),
                this.stage.width()) / 2);
            const length = this.graph.getNumberOfVertices();
            let r = 0;
            const step = (Math.PI * 2) / length;
            for (const v of this.graph.getVertexIds()) {
                const x = centerX + Math.cos(r) * radius;
                const y = centerY + Math.sin(r) * radius;
                vertexDrawings[v] = new VertexDrawing(x, y,
                    this.verticesLayer);
                vertexDrawings[v].addClickCallback(
                    this.vertexClickHandler.bind(this));
                vertexDrawings[v].addDoubleClickCallback(
                    this.vertexDoubleClickHandler.bind(this));
                r += step;
            }
        }
        this.vertexDrawings = vertexDrawings;
        return vertexDrawings;
    }

    addVertexToCurrentGraph(e: Konva.KonvaEventObject<MouseEvent>) {
        const absolutePosition = e.target.getAbsolutePosition();
        const x = e.evt.offsetX - absolutePosition.x;
        const y = e.evt.offsetY - absolutePosition.y;
        const newId = this.graph.addVertex();
        const drawing = new VertexDrawing(x, y, this.verticesLayer);
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
            this.edgesLayer);
        this.graph.addEdge(startId, endId);
        this.edgesLayer.add(edgeDrawing);
        this.edgesLayer.draw();
    }
}
