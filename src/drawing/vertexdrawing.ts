import Konva from "konva";

import EdgeDrawing from "./edgedrawing";

type VertexDrawingEventCallback = (v: VertexDrawing) => void;

export default class VertexDrawing extends Konva.Group {

    selected: boolean;
    label: Konva.Text;
    circle: Konva.Circle;
    moveCallbacks: VertexDrawingEventCallback[];
    clickCallbacks: VertexDrawingEventCallback[];
    doubleClickCallbacks: VertexDrawingEventCallback[];
    edgeDrawings: EdgeDrawing[];

    constructor(x: number, y: number, radius: number, labelText: string) {
        super({ x: x, y: y, draggable: true });
        this.circle = new Konva.Circle({
            radius: radius,
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
            fontSize: radius,
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

    setRadius(radius: number) {
        const ratio = radius / this.circle.radius();
        this.circle.radius(radius);
        this.label.fontSize(Math.round(this.label.fontSize() * ratio));
        this.label.offsetX(this.label.width() / 2);
        this.label.offsetY(this.label.height() / 2);
        // call vertex 'move' callbacks to trigger redraw of edges
        // (necessary in directed graphs to properly place arrows)
        this.callMoveCallbacks();
    }
}
