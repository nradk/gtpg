import Konva from "konva";

import VertexDrawing from "./vertexdrawing";
import { GraphDrawing } from "./graphdrawing";
import { RedrawCallback, Vector2 } from "../commontypes";
import { getMouseEventXY } from "./util";
import { DecorationState, DefaultDecorator } from "../decoration/decorator";
import { EditableText } from "../drawing/editabletext";
import { ToolName } from "../ui_handlers/tools";

type LabelEditCallback = (edgeDrawing: EdgeDrawing, label: string) => boolean;

export default class EdgeDrawing extends Konva.Group {
    private arrow: Konva.Arrow;
    private curvePoint: Konva.Circle;
    private label?: EditableText;
    private labelOffset?: Vector2;
    private decorationState: DecorationState;
    private allowLabelEdit: boolean;
    private readonly startMoveCallbackId: number;
    private readonly endMoveCallbackId: number;
    private labelFontSize: number = 10;

    constructor(private readonly graphDrawing: GraphDrawing,
                readonly start: VertexDrawing,
                readonly end: VertexDrawing,
                private readonly directed: boolean,
                private redrawCallback: RedrawCallback,
                private labelText?: string,
                private labelEditCallback?: LabelEditCallback) {
        super();
        this.arrow = new Konva.Arrow({
            points: [this.start.x(), this.start.y(),
                this.end.x(), this.end.y()],
            stroke: 'black',
            strokeWidth: 2,
            hitStrokeWidth: 12,
            lineCap: 'round',
            lineJoin: 'round',
            pointerLength: directed? 10 : 0,
            pointerWidth: directed? 10 : 0
        });
        this.decorationState = DecorationState.DEFAULT;
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
        this.startMoveCallbackId = this.start.addMoveCallback(this.vertexMoveCallback.bind(this));
        this.endMoveCallbackId = this.end.addMoveCallback(this.vertexMoveCallback.bind(this));
        this.start.registerEdgeDrawing(this);
        this.end.registerEdgeDrawing(this);
        this.setEdgePoints();
        // If a label edit callback has been provided, we allow label edits.
        // Otherwise, we don't. Not allowing edits is accomplished by setting
        // the 'edit allow tool set' to an empty set.
        this.allowLabelEdit = labelEditCallback != undefined;
        if (labelText != undefined) {
            const labelEditOn: Set<ToolName> = this.allowLabelEdit ?
                new Set(["default", "text"]) : new Set();
            this.createLabel(labelText, labelEditOn);
        }
    }

    private createLabel(labelText: string, editableOn: Set<ToolName>) {
        this.label = new EditableText(this.graphDrawing, editableOn,
            {
                text: labelText,
                fontSize: this.labelFontSize,
                hitStrokeWidth: 5,
            });
        this.label.on('click', event => {
            const tool = this.graphDrawing.getTools().getCurrentTool();
            event.cancelBubble = true;
            if (tool == "delete") {
                event.cancelBubble = false;
                this.handleClick(event);
            }
        });
        this.label.updateOffsets();
        this.label.setTextChangeCallback((text: string) => {
            if (this.labelEditCallback == undefined) {
                console.error("Edge label edited when label edit callback"
                    + " was null!");
            }
            const accepted = this.labelEditCallback(this, text);
            if (accepted) {
                this.labelText = this.label.text();
            } else {
                this.label.text(this.labelText);
            }
        });
        this.add(this.label);
        this.labelOffset = this.graphDrawing.getEdgeLabelOffset(this.start, this.end);
        this.updateLabelPosition();
        this.setDecorationState(this.decorationState);
    }

    setLabelFontSize(size: number) {
        this.labelFontSize = size;
        this.label?.fontSize(size);
        this.updateLabelPosition();
    }

    handleClick(evt: Konva.KonvaEventObject<MouseEvent>) {
        const currentTool = this.graphDrawing.getTools().getCurrentTool();
        if (currentTool == "default") {
            this.setCurvePointPosition(getMouseEventXY(evt));
            this.updateLabelPosition();
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
            this.updateLabelPosition();
        });
        this.curvePoint.on("click", e => {
            e.cancelBubble = true;
        });
        this.add(this.curvePoint);
        this.adjustArrowByCurvePoint();
        this.updateLabelPosition();
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
        this.updateLabelPosition();
        this.redrawCallback();
    }

    getCurvePointPosition(): Vector2 {
        if (this.curvePoint) {
            return [this.curvePoint.x(), this.curvePoint.y()];
        }
        return undefined;
    }

    updateLabelPosition() {
        if (this.label == undefined) {
            return;
        }
        this.labelOffset = this.graphDrawing.getEdgeLabelOffset(this.start,
            this.end);
        var labelAnchor: number[];
        if (this.curvePoint != undefined) {
            labelAnchor = [this.curvePoint.x(), this.curvePoint.y()];
        } else {
            labelAnchor = [0, 0];
            labelAnchor[0] = (this.start.x() + this.end.x()) / 2;
            labelAnchor[1] = (this.start.y() + this.end.y()) / 2;
        }
        this.label.x(labelAnchor[0] + this.labelOffset[0]);
        this.label.y(labelAnchor[1] + this.labelOffset[1]);
    }

    setDecorationState(state: DecorationState) {
        this.decorationState = state;
        const selected_color = '#158cba';
        const considering_color = '#ff851b';
        const disabled_color = '#d0d0d0';
        switch (state)  {
            case DecorationState.DEFAULT:
                this.arrow.stroke('black');
                this.label && this.label.fill('black');
                break;
            case DecorationState.SELECTED:
                this.arrow.stroke(selected_color);
                this.label && this.label.fill(selected_color);
                break;
            case DecorationState.DISABLED:
                this.arrow.stroke(disabled_color);
                this.label && this.label.fill(disabled_color);
                break;
            case DecorationState.CONSIDERING:
                this.arrow.stroke(considering_color);
                this.label && this.label.fill(considering_color);
                break;
            default:
                const color = DefaultDecorator.getAuxiliaryColor(state.getAuxiliaryId());
                this.arrow.stroke(color);
                this.label && this.label.fill(color);
        }
        // Thicker width for selected state
        switch (state) {
            case DecorationState.SELECTED:
                this.arrow.strokeWidth(4);
                break;
            default:
                this.arrow.strokeWidth(2);
        }
        switch (state) {
            case DecorationState.CONSIDERING:
                this.arrow.dashEnabled(true);
                this.arrow.dash([5, 5]);
                break;
            default:
                this.arrow.dashEnabled(false);
                this.arrow.dash();
        }
    }

    setEdgeLabel(label: string, editCallback?: LabelEditCallback) {
        if (this.label != undefined) {
            this.clearEdgeLabel();
        }
        this.labelText = label;
        this.labelEditCallback = editCallback;
        this.createLabel(label, new Set());
        this.redrawCallback();
    }

    clearEdgeLabel() {
        if (this.label == undefined) {
            return;
        }
        this.label.remove();
        this.label.destroy();
        this.redrawCallback();
    }

    getDecorationState(): DecorationState {
        return this.decorationState;
    }

    destroy() {
        super.destroy();
        this.start.removeMoveCallback(this.startMoveCallbackId);
        this.start.unregisterEdgeDrawing(this);
        this.end.removeMoveCallback(this.endMoveCallbackId);
        this.end.unregisterEdgeDrawing(this);
        return this;
    }
}
