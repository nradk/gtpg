import Konva from "konva";

import EdgeDrawing from "./edgedrawing";
import { GraphDrawing } from "./graphdrawing";
import { DecorationState, DefaultDecorator } from "../decoration/decorator";
import { Util, Vector2 } from "../commontypes";
import { getBestGapVector } from "../math";
import { EditableText } from "./editabletext";
import { ToolName } from "../ui_handlers/tools";

type VertexDrawingEventCallback = (v: VertexDrawing) => void;
type ExternalLabelPlacement = "anti-centroid" | "best-gap";

const SELECTED_COLOR = '#158cba';
const CONSIDERING_COLOR = '#ff851b';
const DISABLED_COLOR = '#d0d0d0';

export default class VertexDrawing extends Konva.Group {

    private decorationState: DecorationState;
    private label: EditableText;
    private circle: Konva.Circle;
    private moveCallbacks: Map<number, VertexDrawingEventCallback>;
    private clickCallbacks: Map<number, VertexDrawingEventCallback>;
    private edgeDrawings: EdgeDrawing[];
    private externalLabel: Konva.Text;
    private externalLabelPlacement: ExternalLabelPlacement = "best-gap";
    private callbackId: number = 0;

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
        this.moveCallbacks = new Map();
        this.clickCallbacks = new Map();
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
        const _currentTool = () => this.graphDrawing.getTools().getCurrentTool();
        let previousState = DecorationState.DEFAULT;
        const mouseOverHandler = function () {
            document.body.style.cursor = 'pointer';
            const tool = _currentTool();
            // TODO this should be a state
            previousState = this.decorationState;
            if (tool == "default") {
                this.setDecorationState(DecorationState.SELECT_HOVER);
            } else if (tool == "delete") {
                this.setDecorationState(DecorationState.DELETE_HOVER);
            }
            this.draw();
        };
        const mouseOutHandler = function () {
            document.body.style.cursor = 'default';
            this.setDecorationState(previousState);
            this.draw();
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

    setExternalLabelPlacement(placement: ExternalLabelPlacement) {
        this.externalLabelPlacement = placement;
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
                this.circle.stroke(SELECTED_COLOR);
                this.circle.fill(SELECTED_COLOR);
                this.label.fill('white');
                break;
            case DecorationState.DISABLED:
                this.circle.stroke(DISABLED_COLOR);
                this.circle.fill('white');
                this.label.fill(DISABLED_COLOR);
                break;
            case DecorationState.CONSIDERING:
                this.circle.stroke(CONSIDERING_COLOR);
                this.circle.fill('white');
                this.label.fill(CONSIDERING_COLOR);
                break;
            case DecorationState.SELECT_HOVER:
                this.circle.stroke(SELECTED_COLOR);
                this.circle.fill('white');
                this.label.fill(SELECTED_COLOR);
                break;
            case DecorationState.DELETE_HOVER:
                this.circle.stroke("red");
                this.circle.fill("white");
                this.label.fill("red");
                break;
            default:
                const id = state.getAuxiliaryId();
                if (!id) {
                    console.error("Invalid decoration state!");
                    return;
                }
                const color = DefaultDecorator.getAuxiliaryColor(id);
                this.circle.stroke(color);
                this.circle.fill('white');
                this.label.fill(color);
                break;
        }
    }

    getDecorationState(): DecorationState {
        return this.decorationState;
    }

    addMoveCallback(callback: VertexDrawingEventCallback): number {
        this.callbackId++;
        this.moveCallbacks.set(this.callbackId, callback);
        return this.callbackId;
    }

    callMoveCallbacks() {
        this.updateExternalLabelPosition();
        this.moveCallbacks.forEach(callback => callback(this));
    }

    removeMoveCallback(callbackId: number) {
        if (this.moveCallbacks.has(callbackId)) {
            this.moveCallbacks.delete(callbackId);
        } else {
            throw Error(`No callback with callbackId ${callbackId} present!`);
        }
    }

    addClickCallback(callback: VertexDrawingEventCallback): number {
        this.callbackId++;
        this.clickCallbacks.set(this.callbackId, callback);
        return this.callbackId;
    }

    removeClickCallback(callbackId: number) {
        if (this.clickCallbacks.has(callbackId)) {
            this.clickCallbacks.delete(callbackId);
        } else {
            throw Error(`No callback with callbackId ${callbackId} present!`);
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
                fontSize: 12,
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
        let labelPosition: Vector2;
        const vVect: Vector2 = [this.x(), this.y()];
        const graph = this.graphDrawing.getGraph();
        const hasNeighbors = graph.getVertexNeighborIds(this.vertexId, true).size > 0;
        if (this.externalLabelPlacement == "best-gap" && hasNeighbors) {
            const neighborDirections: Vector2[] = [];
            for (const n of graph.getVertexNeighborIds(this.vertexId, true)) {
                const nPt = this.graphDrawing.getVertexPosition(n);
                const nVect = [nPt.x, nPt.y];
                neighborDirections.push([nVect[0] - vVect[0], nVect[1] - vVect[1]]);
            }
            const gapVect = getBestGapVector(neighborDirections);
            labelPosition = Util.scalarVectorMultiply(this.getRadius() * 2,
                gapVect);
        } else {
            const centroid = this.graphDrawing.getCentroid();
            let toCentroid = Util.getDirectionVectorNormalized(vVect, centroid);
            // If there is only one vertex, the direction vector is [0, 0] and
            // the normalized direction vector is [0/0, 0/0] == [NaN, NaN].
            if (isNaN(toCentroid[0]) || isNaN(toCentroid[1])) {
                toCentroid = [-1, 0]; // Towards the left, this will be negated
                // in the next line to place the label to the right
            }
            labelPosition = Util.scalarVectorMultiply(-this.getRadius() * 2,
                toCentroid);
        }
        this.externalLabel.x(labelPosition[0]);
        this.externalLabel.y(labelPosition[1]);
        VertexDrawing.setTextOffsetOnBoundary(this.externalLabel);
        this.graphDrawing.getStage().draw();
    }

    static setTextOffsetOnBoundary(text: Konva.Text, anchor?: Vector2) {
        const [w, h] = [text.width(), text.height()];
        const [x, y] = [text.x(), text.y()];
        anchor = anchor ?? [0, 0];
        const toAnchor: Vector2 = [anchor[0] - x, anchor[1] - y];
        const alpha = Math.atan2(-toAnchor[1], toAnchor[0]);
        const thresholdAlpha = Math.atan2(h, w);
        let dx = 0, dy = 0;
        if (Math.abs(alpha) > thresholdAlpha && Math.abs(alpha) < Math.PI - thresholdAlpha) {
            // The center-to-anchor line intersects with a horizontal boundary
            // of the text bounding box
            const L = h / (2 * Math.sin(alpha)); // Length from center to boundary
            dx = L * Math.cos(alpha);
            dy = alpha > 0 ? -h/2 : h/2;
        } else {
            // The center-to-anchor line intersects with a vertical boundary
            // of the text bounding box
            const L = w / (2 * Math.cos(alpha)); // Length from center to boundary
            dx = Math.abs(alpha) < thresholdAlpha ? w/2 : -w/2;
            dy = -L * Math.sin(alpha);
        }
        text.offsetX(text.width() / 2);
        text.offsetY(text.height() / 2);
        text.x(text.x() - dx);
        text.y(text.y() - dy);
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
