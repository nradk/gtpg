import { Point, Size } from "./commontypes";
import Graph from "./graph";

export type LayoutName = "circular" | "random" | "grid";

export interface PositionMap {
    [id: number]: Point;
};

export interface Layout {
    getVertexPositions(graph: Graph): PositionMap;
}

export class RandomLayout implements Layout {

    stageDims: Size;

    constructor(stageDims: Size) {
        this.stageDims = stageDims;
    }

    getVertexPositions(graph: Graph): PositionMap {
        const positions: PositionMap = {};
        for (const v of graph.getVertexIds()) {
            const x = Math.random() * this.stageDims.width;
            const y = Math.random() * this.stageDims.height;
            positions[v] = {x: x, y: y};
        }
        return positions;
    }
}

export class CircularLayout implements Layout {

    stageDims: Size;

    constructor(stageDims: Size) {
        this.stageDims = stageDims;
    }

    getVertexPositions(graph: Graph): PositionMap {
        const positions: PositionMap = {};
        const centerX = this.stageDims.width / 2;
        const centerY = this.stageDims.height / 2;
        const radius = Math.floor(0.8 * Math.min(this.stageDims.height,
            this.stageDims.width) / 2);
        const length = graph.getNumberOfVertices();
        let r = 0;
        const step = (Math.PI * 2) / length;
        for (const v of graph.getVertexIds()) {
            const x = centerX + Math.cos(r) * radius;
            const y = centerY + Math.sin(r) * radius;
            positions[v] = {x: x, y: y};
            r += step;
        }
        return positions;
    }
}

export class GridLayout implements Layout {

    stageDims: Size;

    constructor(stageDims: Size) {
        this.stageDims = stageDims;
    }

    getVertexPositions(graph: Graph): PositionMap {
        const positions: PositionMap = {};
        const centerX = this.stageDims.width / 2;
        const centerY = this.stageDims.height / 2;
        const length = graph.getNumberOfVertices();
        const w = Math.ceil(Math.sqrt(length));
        const h = Math.ceil(length / w);
        const d = this.stageDims.height / 5;
        const originX = centerX - d * (w - 1) / 2;
        const originY = centerY - d * (h - 1) / 2;
        const vertexIds = graph.getVertexIds();
        for (let i = 0; i < vertexIds.length; i++) {
            positions[vertexIds[i]] = {
                x : originX + (i % w) * d,
                y : originY + Math.floor(i / w) * d
            };
        }
        return positions;
    }
}

export class FixedLayout implements Layout {
    positions: PositionMap;

    constructor(positions: PositionMap) {
        this.positions = positions;
    }

    getVertexPositions(_: Graph): PositionMap {
        return this.positions;
    }
}

export function getLayoutForStageDims(name: LayoutName, stageDims: Size)
        : Layout {
    if (name === "circular") {
        return new CircularLayout(stageDims);
    } else if (name == "random") {
        return new RandomLayout(stageDims);
    } else if (name == "grid") {
        return new GridLayout(stageDims);
    } else {
        throw Error("Invalid layout name " + name);
    }
}

