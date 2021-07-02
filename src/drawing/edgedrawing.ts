import Konva from "konva";

import VertexDrawing from "./vertexdrawing";
import { GraphDrawing } from "./graphdrawing";
import { RedrawCallback, Vector2 } from "../commontypes";
import { getMouseEventXY } from "./util";
import { DecorationState, DefaultDecorator } from "../decoration/decorator";
import { showWarning } from "../ui_handlers/notificationservice";
import { EditableText } from "../drawing/editabletext";
import { ToolName } from "../ui_handlers/tools";

type WeightUpdateCallback = (s: VertexDrawing, e: VertexDrawing, w: number) => void;

export default class EdgeDrawing extends Konva.Group {
    directed: boolean;
    redrawCallback: RedrawCallback;
    arrow: Konva.Arrow;
    curvePoint: Konva.Circle;
    weight?: number;
    weightText?: EditableText;
    weightOffset?: Vector2;
    weightChangeCallback?: WeightUpdateCallback;
    decorationState: DecorationState;
    private readonly startMoveCallbackId: number;
    private readonly endMoveCallbackId: number;

    constructor(private readonly graphDrawing: GraphDrawing,
                private readonly start: VertexDrawing,
                private readonly end: VertexDrawing,
                directed: boolean,
                redrawCallback: RedrawCallback,
                weight?: number,
                weightChangeCallback?: WeightUpdateCallback) {
        super();
        this.arrow = new Konva.Arrow({
            points: [this.start.x(), this.start.y(),
                this.end.x(), this.end.y()],
            stroke: 'black',
            strokeWidth: 2,
            hitStrokeWidth: 7,
            lineCap: 'round',
            lineJoin: 'round',
            pointerLength: directed? 10 : 0,
            pointerWidth: directed? 10 : 0
        });
        this.decorationState = DecorationState.DEFAULT;
        this.weight = weight;
        this.weightChangeCallback = weightChangeCallback;
        this.add(this.arrow);
        this.arrow.on('mouseover', () => {
            if (this.curvePoint != undefined) {
                this.curvePoint.opacity(1);
                this.redrawCallback();
            }
        });
        this.arrow.on('mouseout', () => {
            if (this.curvePoint != undefined) {
                this.curvePoint.opacity(0);
                this.redrawCallback();
            }
        });
        this.arrow.on('click', this.handleClick.bind(this));
        this.directed = directed;
        this.redrawCallback = redrawCallback;
        this.startMoveCallbackId = this.start.addMoveCallback(this.vertexMoveCallback.bind(this));
        this.endMoveCallbackId = this.end.addMoveCallback(this.vertexMoveCallback.bind(this));
        this.start.registerEdgeDrawing(this);
        this.end.registerEdgeDrawing(this);
        this.setEdgePoints();
        const weightEditOn: Set<ToolName> = new Set(["default", "text"]);
        if (this.weight != undefined) {
            this.weightText = new EditableText(this.graphDrawing, weightEditOn,
            {
                text: weight + "",
                fontSize: 14,
                hitStrokeWidth: 5,
            });
            this.weightText.on('click', event => {
                const tool = this.graphDrawing.getTools().getCurrentTool();
                event.cancelBubble = true;
                if (tool == "delete") {
                    event.cancelBubble = false;
                    this.handleClick(event);
                }
            });
            this.weightText.updateOffsets();
            this.weightText.setTextChangeCallback((text: string) => {
                const weight = Number(text);
                if (isNaN(weight)) {
                    console.warn("Cannot set a non-numeric weight!");
                    showWarning("Warning", "Weight must be numeric!");
                    this.weightText.text(this.weight.toString());
                    return;
                }
                this.weight =  weight;
                this.weightChangeCallback?.(this.start, this.end, weight);
            });
            this.add(this.weightText);
            this.weightOffset = graphDrawing.getWeightOffset(this.start, this.end);
            this.updateWeightPosition();
        }
    }

    handleClick(evt: Konva.KonvaEventObject<MouseEvent>) {
        const currentTool = this.graphDrawing.getTools().getCurrentTool();
        if (currentTool == "default") {
            this.setCurvePointPosition(getMouseEventXY(evt));
            this.updateWeightPosition();
        } else if (currentTool == "delete") {
            this.graphDrawing.removeEdge(this.start, this.end);
        }
        evt.cancelBubble = true;
    }

    setCurvePointPosition(position: Vector2) {
        if (this.curvePoint != undefined) {
            this.curvePoint.remove();
            this.curvePoint.destroy();
        }
        const [x, y] = position;
        this.curvePoint = new Konva.Circle({
            x: x,
            y: y,
            radius: 5,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 1,
            draggable: true
        });
        this.curvePoint.on("mouseover", (e) => {
            document.body.style.cursor = "move";
            this.curvePoint.opacity(1);
            this.curvePoint.fill("red");
            this.redrawCallback();
            e.cancelBubble = true;
        });
        this.curvePoint.on("mouseout", (e) => {
            document.body.style.cursor = "default";
            this.curvePoint.opacity(0);
            this.curvePoint.fill("white");
            this.redrawCallback();
            e.cancelBubble = true;
        });
        this.curvePoint.on("dragmove", () => {
            this.adjustArrowByCurvePoint();
            this.updateWeightPosition();
        });
        this.curvePoint.on("click", e => {
            e.cancelBubble = true;
        });
        this.add(this.curvePoint);
        this.adjustArrowByCurvePoint();
        this.updateWeightPosition();
    }

    adjustArrowByCurvePoint() {
        const l = this.arrow.points().length;
        const [sx, sy] = [this.arrow.points()[0], this.arrow.points()[1]];
        const [ex, ey] = [this.arrow.points()[l-2], this.arrow.points()[l-1]];
        this.arrow.points([sx, sy,
                           this.curvePoint.x(), this.curvePoint.y(),
                           ex, ey]);
        this.arrow.tension(1);
    }

    setEdgePoints() {
        const start = this.start;
        const end = this.end;
        const arrowPoints = [start.x(), start.y()];
        if (this.curvePoint != null) {
            arrowPoints.push(this.curvePoint.x(), this.curvePoint.y());
        }
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
            this.arrow.points(arrowPoints.concat(endPoint));
        } else {
            this.arrow.points(arrowPoints.concat([end.x(), end.y()]));
        }
    }

    vertexMoveCallback(_: VertexDrawing) {
        this.setEdgePoints();
        this.updateWeightPosition();
        this.redrawCallback();
    }

    getCurvePointPosition(): Vector2 {
        if (this.curvePoint) {
            return [this.curvePoint.x(), this.curvePoint.y()];
        }
        return undefined;
    }

    updateWeightPosition() {
        if (this.weightText == undefined) {
            return;
        }
        this.weightOffset = this.graphDrawing.getWeightOffset(this.start,
            this.end);
        var weightAnchor: number[];
        if (this.curvePoint != undefined) {
            weightAnchor = [this.curvePoint.x(), this.curvePoint.y()];
        } else {
            weightAnchor = [0, 0];
            weightAnchor[0] = (this.start.x() + this.end.x()) / 2;
            weightAnchor[1] = (this.start.y() + this.end.y()) / 2;
        }
        this.weightText.x(weightAnchor[0] + this.weightOffset[0]);
        this.weightText.y(weightAnchor[1] + this.weightOffset[1]);
    }

    setDecorationState(state: DecorationState) {
        this.decorationState = state;
        const selected_color = '#158cba';
        const considering_color = '#ff851b';
        const disabled_color = '#d0d0d0';
        switch (state)  {
            case DecorationState.DEFAULT:
                this.arrow.stroke('black');
                this.weightText && this.weightText.fill('black');
                break;
            case DecorationState.SELECTED:
                this.arrow.stroke(selected_color);
                this.weightText && this.weightText.fill(selected_color);
                break;
            case DecorationState.DISABLED:
                this.arrow.stroke(disabled_color);
                this.weightText && this.weightText.fill(disabled_color);
                break;
            case DecorationState.CONSIDERING:
                this.arrow.stroke(considering_color);
                this.weightText && this.weightText.fill(considering_color);
                break;
            default:
                const color = DefaultDecorator.getAuxiliaryColor(state.getAuxiliaryId());
                this.arrow.stroke(color);
                this.weightText && this.weightText.fill(color);
        }
    }

    getDecorationState(): DecorationState {
        return this.decorationState;
    }

    destroy() {
        super.destroy();
        this.start.removeMoveCallback(this.startMoveCallbackId);
        this.end.removeMoveCallback(this.endMoveCallbackId);
        return this;
    }
}
