import Konva from "konva";

import EdgeDrawing from "./edgedrawing";
import { GraphDrawing } from "./graphdrawing";
import { DecorationState, DefaultDecorator } from "../decoration/decorator";
import { Util, Vector2 } from "../commontypes";
import { getBestGapVector } from "../math";
import { EditableText } from "./editabletext";
import { ToolName } from "../ui_handlers/tools";

type VertexDrawingEventCallback = (v: VertexDrawing) => void;

export default class VertexDrawing extends Konva.Group {

    private decorationState: DecorationState;
    private label: EditableText;
    private circle: Konva.Circle;
    private moveCallbacks: VertexDrawingEventCallback[];
    private clickCallbacks: VertexDrawingEventCallback[];
    private edgeDrawings: EdgeDrawing[];
    private externalLabel: Konva.Text;

    constructor(x: number, y: number, radius: number,
            private graphDrawing: GraphDrawing, private vertexId: number) {
        super({ x: x, y: y, draggable: true });
        this.circle = new Konva.Circle({
            radius: radius,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 2
        });
        this.add(this.circle);
        this.decorationState = DecorationState.DEFAULT;
        this.moveCallbacks = [];
        this.moveCallbacks = [];
        this.clickCallbacks = [];
        this.edgeDrawings = [];
        const graph = this.graphDrawing.getGraph();
        const labelEditOn: Set<ToolName> = new Set(["text"]);
        this.label = new EditableText(this.graphDrawing, labelEditOn, {
            text: graph.getVertexLabel(vertexId) ?? "",
            fontSize: radius,
            fill: 'black'
        });
        this.label.setTextChangeCallback((text: string) => {
            this.graphDrawing.getGraph().setVertexLabel(this.vertexId, text);
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
    }

    getRadius(): number{
        return this.circle.radius();
    }

    select() {
        this.setDecorationState(DecorationState.SELECTED);
    }

    isSelected(): boolean {
        return this.decorationState === DecorationState.SELECTED;
    }

    unselect() {
        this.setDecorationState(DecorationState.DEFAULT);
    }

    setDecorationState(state: DecorationState) {
        this.decorationState = state;
        switch (state)  {
            case DecorationState.DEFAULT:
                this.circle.stroke('black');
                this.circle.fill('white');
                this.label.fill('black');
                break;
            case DecorationState.SELECTED:
                this.circle.stroke('#158cba');
                this.circle.fill('#158cba');
                this.label.fill('white');
                break;
            case DecorationState.DISABLED:
                this.circle.stroke('#f0f0f0');
                this.circle.fill('white');
                this.label.fill('#f0f0f0');
                break;
            case DecorationState.CONSIDERING:
                this.circle.stroke('#ff851b');
                this.circle.fill('white');
                this.label.fill('#ff851b');
                break;
            default:
                const color = DefaultDecorator.getAuxiliaryColor(state.getAuxiliaryId());
                this.circle.stroke(color);
                this.circle.fill('white');
                this.label.fill(color);
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
