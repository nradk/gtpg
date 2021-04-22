import Konva from "konva";

import VertexDrawing from "./vertexdrawing";
import { RedrawCallback, Vector2 } from "../commontypes";
import { getMouseEventXY } from "./util";

export default class EdgeDrawing extends Konva.Group {
    start: VertexDrawing;
    end: VertexDrawing;
    directed: boolean;
    redrawCallback: RedrawCallback;
    arrow: Konva.Arrow;
    curvePoint: Konva.Circle;

    constructor(start: VertexDrawing, end: VertexDrawing, directed: boolean,
                redrawCallback: RedrawCallback) {
        super();
        this.arrow = new Konva.Arrow({
            points: [start.x(), start.y(),
                end.x(), end.y()],
            stroke: 'black',
            fill: 'black',
            strokeWidth: 2,
            lineCap: 'round',
            lineJoin: 'round',
            pointerLength: directed? 10 : 0,
            pointerWidth: directed? 10 : 0
        });
        this.add(this.arrow);
        this.on('mouseover', () => {
            if (this.curvePoint != undefined) {
                this.curvePoint.opacity(1);
                this.redrawCallback();
            } else {
                document.body.style.cursor = 'crosshair';
            }
        });
        this.on('mouseout', () => {
            if (this.curvePoint != undefined) {
                this.curvePoint.opacity(0);
                this.redrawCallback();
            } else {
                document.body.style.cursor = 'default';
            }
        });
        this.on('click', this.handleClick.bind(this));
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

    handleClick(evt: Konva.KonvaEventObject<MouseEvent>) {
        this.setCurvePointPosition(getMouseEventXY(evt));
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
        this.curvePoint.on("mouseover", () => {
            document.body.style.cursor = "move";
            this.curvePoint.fill("red");
        });
        this.curvePoint.on("mouseout", () => {
            document.body.style.cursor = "default";
            this.curvePoint.fill("white");
        });
        this.curvePoint.on("dragmove", () => {
            this.adjustArrowByCurvePoint();
        });
        this.add(this.curvePoint);
        this.adjustArrowByCurvePoint();
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
            this.arrow.points([start.x(), start.y()].concat(endPoint));
        } else {
            this.arrow.points([start.x(), start.y(), end.x(), end.y()]);
        }
    }

    vertexMoveCallback(_: VertexDrawing) {
        this.setEdgePoints();
        this.redrawCallback();
    }

    getCurvePointPosition(): Vector2 {
        if (this.curvePoint) {
            return [this.curvePoint.x(), this.curvePoint.y()];
        }
        return undefined;
    }
}
