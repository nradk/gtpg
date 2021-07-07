import Konva from "konva";

export interface Point {
    x: number,
    y: number
};

export type Vector2 = [number, number];
export type VectorPolar = [number, number];

export interface Size {
    height: number;
    width: number;
}

export type VertexInput = {vertexId: number};
export type SourceSinkInput = {sourceId: number, sinkId: number};
export type MouseEventCallback = ((e: Konva.KonvaEventObject<MouseEvent>)
                                  => void);
export type NullaryCallback = () => void;
export type RedrawCallback = () => void;

export class NoVertexClickedError extends Error {
}

export class Util {
    static pointToVector(point: Point): Vector2 {
        return [point.x, point.y];
    }

    static vectorToPoint(vector: Vector2): Point {
        return {x: vector[0], y: vector[1]};
    }

    static getDistance(v1: Vector2, v2: Vector2): number {
        return Math.sqrt(Math.pow(v1[0] - v2[0], 2) +
                         Math.pow(v1[1] - v2[1], 2));
    }

    static getDistanceFromPoints(start: Point, end: Point): number {
        return Math.sqrt(Math.pow(start.x - end.x, 2) +
                         Math.pow(start.y - end.y, 2));
    }

    static getDistanceSquaredFromPoints(start: Point, end: Point): number {
        return Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2);
    }

    static getDirectionVectorNormalized(from_: Vector2, to: Vector2): Vector2 {
        const d = this.getDistance(from_, to);
        return [(to[0] - from_[0]) / d, (to[1] - from_[1]) / d];
    }

    static getDirectionVectorNormalizedFromPoints(from_: Point, to: Point) {
        return this.getDirectionVectorNormalized(this.pointToVector(from_),
                                       this.pointToVector(to));
    }

    static scalarVectorMultiply(factor: number, v: Vector2): Vector2 {
        return [v[0] * factor, v[1] * factor];
    }

    static vectorAdd(v1: Vector2, v2: Vector2): Vector2 {
        return [v1[0] + v2[0], v1[1] + v2[1]];
    }

    static getNormalized(v: Vector2): Vector2 {
        return this.scalarVectorMultiply(1 / this.getDistance(v, [0, 0]), v);
    }
}
