import Konva from "konva";

import EdgeDrawing from "./edgedrawing";
import GraphDrawing from "./graphdrawing";
import { DecorationState } from "../decoration/decorator";
import { Util, Vector2 } from "../commontypes";
import { getBestGapVector } from "../math";

type VertexDrawingEventCallback = (v: VertexDrawing) => void;

export default class VertexDrawing extends Konva.Group {

    private decorationState: DecorationState;
    private label: Konva.Text;
    private circle: Konva.Circle;
    private moveCallbacks: VertexDrawingEventCallback[];
    private clickCallbacks: VertexDrawingEventCallback[];
    private doubleClickCallbacks: VertexDrawingEventCallback[];
    private edgeDrawings: EdgeDrawing[];
    private externalLabel: Konva.Text;

    constructor(x: number, y: number, radius: number, labelText: string,
            private graphDrawing: GraphDrawing, private vertexId: number) {
        super({ x: x, y: y, draggable: true });
        this.circle = new Konva.Circle({
            radius: radius,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 2
        });
        this.add(this.circle);
        this.decorationState = "default";
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
        const clickHandler = () => {
            this.clickCallbacks.forEach(callback => callback(this));
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
        this.setDecorationState("selected");
    }

    isSelected(): boolean {
        return this.decorationState === "selected";
    }

    unselect() {
        this.setDecorationState("default");
    }

    setDecorationState(state: DecorationState) {
        this.decorationState = state;
        switch (state)  {
            case "default":
                this.circle.stroke('black');
                this.circle.fill('white');
                this.label.fill('black');
                break;
            case "selected":
                this.circle.stroke('#158cba');
                this.circle.fill('#158cba');
                this.label.fill('white');
                break;
            case "disabled":
                this.circle.stroke('#f0f0f0');
                this.circle.fill('white');
                this.label.fill('#f0f0f0');
                break;
            case "considering":
                this.circle.stroke('#ff851b');
                this.circle.fill('white');
                this.label.fill('#ff851b');
                break;
        }
    }

    getDecorationState(): DecorationState {
        return this.decorationState;
    }

    addMoveCallback(callback: VertexDrawingEventCallback) {
        this.moveCallbacks.push(callback);
    }

    callMoveCallbacks() {
        this.updateExternalLabelPosition();
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

    setExternalLabel(text: string) {
        if (this.externalLabel == undefined) {
            this.externalLabel = new Konva.Text({
                text: text,
                fontsize: 15,
                fill: 'black'
            });
            this.add(this.externalLabel);
        } else {
            this.externalLabel.text(text);
        }
        this.updateExternalLabelPosition();
    }

    updateExternalLabelPosition() {
        if (this.externalLabel == undefined) {
            return;
        }
        const neighborDirections: Vector2[] = [];
        const vVect = [this.x(), this.y()];
        //console.log(`vVect for ${this.vertexId} is ${vVect}`);
        for (const n of this.graphDrawing.getGraph().getVertexNeighborIds(
                this.vertexId)) {
            const nPt = this.graphDrawing.getVertexPositions()[n];
            const nVect = [nPt.x, nPt.y];
            //console.log(`Neighbor ${n}'s nVect is ${nVect}`);
            neighborDirections.push([nVect[0] - vVect[0], nVect[1] - vVect[1]]);
        }
        //console.log(`Neighbor directions for ${this.vertexId} are ${neighborDirections}`);
        const gapVect = getBestGapVector(neighborDirections);
        const labelPosition = Util.scalarVectorMultiply(this.getRadius() * 2,
            gapVect);
        //console.log(`Label position for ${this.vertexId} is ${labelPosition}`);
        this.externalLabel.x(labelPosition[0]);
        this.externalLabel.y(labelPosition[1]);
        this.externalLabel.offsetX(this.externalLabel.width() / 2);
        this.externalLabel.offsetY(this.externalLabel.height() / 2);
        this.graphDrawing.getStage().draw();
    }

    clearExternalLabel(dontRedrawStage?: boolean) {
        if (this.externalLabel == undefined) {
            return;
        }
        this.externalLabel.remove();
        this.externalLabel.destroy();
        this.externalLabel = undefined;
        if (!dontRedrawStage) {
            this.graphDrawing.getStage().draw();
        }
    }

    getVertexId(): number {
        return this.vertexId;
    }

    getEdgeDrawings(): EdgeDrawing[] {
        return this.edgeDrawings;
    }
}
