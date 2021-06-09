import Konva from "konva";

import VertexDrawing from "./vertexdrawing";
import { RedrawCallback, Vector2 } from "../commontypes";
import { getMouseEventXY } from "./util";
import { DecorationState } from "../decoration/decorator";
import { EditWeight } from "../ui_handlers/editweight";

type WeightUpdateCallback = (s: VertexDrawing, e: VertexDrawing, w: number) => void;

export default class EdgeDrawing extends Konva.Group {
    start: VertexDrawing;
    end: VertexDrawing;
    directed: boolean;
    redrawCallback: RedrawCallback;
    arrow: Konva.Arrow;
    curvePoint: Konva.Circle;
    weight?: number;
    weightText?: Konva.Text;
    weightOffset?: Vector2;
    weightChangeCallback?: WeightUpdateCallback;
    decorationState: DecorationState;

    constructor(start: VertexDrawing, end: VertexDrawing, directed: boolean,
                redrawCallback: RedrawCallback, weight?: number,
                weightOffset?: Vector2,
                weightChangeCallback?: WeightUpdateCallback) {
        super();
        this.arrow = new Konva.Arrow({
            points: [start.x(), start.y(),
                end.x(), end.y()],
            stroke: 'black',
            strokeWidth: 2,
            lineCap: 'round',
            lineJoin: 'round',
            pointerLength: directed? 10 : 0,
            pointerWidth: directed? 10 : 0
        });
        this.decorationState = "default";
        this.weight = weight;
        this.weightChangeCallback = weightChangeCallback;
        this.add(this.arrow);
        this.arrow.on('mouseover', () => {
            if (this.curvePoint != undefined) {
                this.curvePoint.opacity(1);
                this.redrawCallback();
            } else {
                document.body.style.cursor = 'crosshair';
            }
        });
        this.arrow.on('mouseout', () => {
            if (this.curvePoint != undefined) {
                this.curvePoint.opacity(0);
                this.redrawCallback();
            } else {
                document.body.style.cursor = 'default';
            }
        });
        this.arrow.on('click', this.handleClick.bind(this));
        this.start = start;
        this.end = end;
        this.directed = directed;
        this.redrawCallback = redrawCallback;
        this.start.addMoveCallback(this.vertexMoveCallback.bind(this));
        this.end.addMoveCallback(this.vertexMoveCallback.bind(this));
        this.start.registerEdgeDrawing(this);
        this.end.registerEdgeDrawing(this);
        this.setEdgePoints();
        if (this.weight != undefined) {
            this.weightText = new Konva.Text({
                text: weight + "",
                fontSize: 14,
            });
            this.weightText.on('mouseover', () => {
                document.body.style.cursor = 'text';
            });
            this.weightText.on('mouseout', () => {
                document.body.style.cursor = 'default';
            });
            this.weightText.on('dblclick', event => {
                EditWeight.editWeight(w => {
                    this.weightChangeCallback(this.start, this.end, w)
                    this.weightText.text(w + "");
                    this.redrawCallback();
                });
                event.cancelBubble = true;
            });
            this.weightText.on('click', event => {
                event.cancelBubble = true;
            });
            this.weightText.offsetX(this.weightText.width() / 2);
            this.weightText.offsetY(this.weightText.height() / 2);
            this.add(this.weightText);
            this.weightOffset = weightOffset;
            if (weightOffset == undefined) {
                console.warn("Weight offset undefined for weighted edge");
                this.weightOffset = [5, 5];
            }
            this.updateWeightPosition();
        }
    }

    handleClick(evt: Konva.KonvaEventObject<MouseEvent>) {
        this.setCurvePointPosition(getMouseEventXY(evt));
        this.updateWeightPosition();
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
        switch (state)  {
            case "default":
                this.arrow.stroke('black');
                this.weightText && this.weightText.fill('black');
                break;
            case "selected":
                this.arrow.stroke('#158cba');
                this.weightText && this.weightText.fill('#158cba');
                break;
            case "disabled":
                this.arrow.stroke('#f0f0f0');
                this.weightText && this.weightText.fill('#f0f0f0');
                break;
            case "considering":
                this.arrow.stroke('#ff851b');
                this.weightText && this.weightText.fill('#ff851b');
                break;
        }
    }
}
