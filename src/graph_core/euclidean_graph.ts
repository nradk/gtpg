import { Graph, fromJsonObject } from "./graph";
import { PositionMap } from "../drawing/layouts";
import { Util, Point } from "../commontypes";


export class EuclideanGraph implements Graph {
    private readonly positions: PositionMap;
    private readonly labels: Map<number, string>;

    constructor(positions?: PositionMap, labels?: Map<number, string>) {
        this.positions = positions ??  new Map();
        this.labels = labels ?? new Map();
    }

    getVertexIds(): Set<number> {
        return new Set(this.positions.keys());
    }

    getVertexNeighborIds(vertexId: number): Set<number> {
        const n = this.getVertexIds();
        n.delete(vertexId);
        return n;
    }


    setVertexLabel(vertexId: number, label: string): void {
        this.labels.set(vertexId, label);
    }


    getVertexLabel(vertexId: number): string {
        return this.labels.get(vertexId);
    }


    getAllVertexLabels(): Map<number, string> {
        return this.labels;
    }


    getEdgeList(): number[][] {
        const vertices = this.getVertexIds();
        const edges: number[][] = [];
        for (const f of vertices) {
            for (const t of vertices) {
                if (t <= f) {
                    continue;
                }
                edges.push([f, t, Util.getDistanceFromPoints(
                    this.positions.get(f), this.positions.get(t))]);
            }
        }
        return edges;
    }


    areNeighbors(startVertex: number, endVertex: number): boolean {
        return startVertex != endVertex;
    }


    getNumberOfVertices(): number {
        return this.getVertexIds().size;
    }


    addVertex(vertexId?: number, label?: string, position?: Point): number {
        let newId: number;
        if (vertexId != undefined) {
            if (this.positions.has(vertexId)) {
                throw Error(`Vertex ${vertexId} already exists in the graph.`);
            }
            newId = vertexId;
        } else if (this.getNumberOfVertices() == 0) {
            newId = 1;
        } else {
            newId = Math.max(...this.getVertexIds()) + 1;
        }
        const pos = position ?? EuclideanGraph.getRandomPosition();
        this.positions.set(newId, pos);
        if (label != undefined) {
            this.setVertexLabel(newId, label);
        }
        return newId;
    }

    removeVertex(vertexId: number): void {
        this.positions.delete(vertexId);
        if (this.labels.has(vertexId)) {
            this.labels.delete(vertexId);
        }
    }


    addEdge(_: number, __: number): void {
        throw new Error("Cannot add an edge to an Euclidean Graph!");
    }


    removeEdge(_: number, __: number): void {
        throw new Error("Cannot remove an edge from an Euclidean Graph!");
    }


    doesEdgeExist(startVertexId: number, endVertexId: number): boolean {
        return this.positions.has(startVertexId) && this.positions.has(endVertexId);
    }


    isDirected(): boolean {
        return false;
    }


    toJSON(): object {
        return {
            positions: Object.fromEntries(this.positions),
            vertexLabels: Object.fromEntries(this.labels),
            isEuclidean: true
        };
    }


    clone(): Graph {
        return fromJsonObject(this.toJSON());
    }

    isWeighted(): boolean {
        return true;
    }

    populateLabelsFromIds(): void {
    }

    private static getRandomPosition(): Point {
        return { x: Math.random() * 100, y: Math.random() * 100 };
    }

    static fromJsonObject(jsonObject: any): EuclideanGraph {
        const obj: {
            positions: { [id: number]: Point },
            vertexLabels: { [id: number]: string },
            isEuclidean: true
        } = jsonObject;
        let labels:  Map<number, string>;
        if (obj.vertexLabels) {
            const entries = Object.entries(obj.vertexLabels);
            labels = new Map(entries.map(([key, value]) => [parseInt(key), value]));
        } else {
            // If no labels present, create labels from vertex ids.
            labels = new Map<number, string>();
            Object.entries(obj.positions).forEach(([key, _]) => {
                labels.set(parseInt(key), key);
            });
        }
        let positions:  Map<number, Point>;
        if (obj.positions) {
            const entries = Object.entries(obj.positions);
            positions = new Map(entries.map(([key, value]) => [parseInt(key), value]));
        } else {
            // If no labels present, create labels from vertex ids.
            positions = new Map<number, Point>();
            Object.entries(obj.positions).forEach(([key, _]) => {
                positions.set(parseInt(key), EuclideanGraph.getRandomPosition());
            });
        }
        return new EuclideanGraph(positions, labels);
    }
}
