import Konva from "konva";

import VertexDrawing from "./vertexdrawing";
import { RedrawCallback } from "../commontypes";

export default class EdgeDrawing extends Konva.Arrow {
    start: VertexDrawing;
    end: VertexDrawing;
    directed: boolean;
    redrawCallback: RedrawCallback;

    // Third argument is supposed to be 'directed'
    constructor(start: VertexDrawing, end: VertexDrawing, directed: boolean,
                redrawCallback: RedrawCallback) {
        super({
            points: [start.x(), start.y(),
                end.x(), end.y()],
            stroke: 'black',
            fill: 'black',
            strokeWidth: 2,
            lineCap: 'round',
            lineJoin: 'round',
            pointerLength: directed? 10 : 0,
            pointerWidth: directed? 10 : 0,

        });
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
            this.points([start.x(), start.y()].concat(endPoint));
        } else {
            this.points([start.x(), start.y(), end.x(), end.y()]);
        }
    }

    vertexMoveCallback(_: VertexDrawing) {
        this.setEdgePoints();
        this.redrawCallback();
    }
}



