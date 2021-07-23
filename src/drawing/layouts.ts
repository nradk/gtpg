import { Point, Size, Vector2, Util } from "../commontypes";
import { Graph } from "../graph_core/graph";

export type LayoutName = "circular" | "bipartite" | "grid" | "forcebased";

export type PositionMap = Map<number, Point>;

export type RelayoutCallback = (map: PositionMap) => void;

export abstract class Layout {
    abstract getVertexPositions(graph: Graph): PositionMap;

    updateVertexPositions(graph: Graph, positions: PositionMap) {
        const p = this.getVertexPositions(graph);
        for (const v of p.keys()) {
            positions.set(v, p.get(v));
        }
    }
    abstract isContinuous(): boolean;
}

// Empty layout, does nothing
export class EmptyLayout extends Layout {
    getVertexPositions(_: Graph): PositionMap {
        return new Map();
    }

    updateVertexPositions(_: Graph, __: PositionMap) {
    }

    isContinuous() {
        return false;
    }
}

export class CircularLayout extends Layout {

    stageDims: Size;

    constructor(stageDims: Size) {
        super();
        this.stageDims = stageDims;
    }

    getVertexPositions(graph: Graph): PositionMap {
        const positions: PositionMap = new Map();
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
            positions.set(v, {x: x, y: y});
            r += step;
        }
        return positions;
    }

    isContinuous() {
        return false;
    }
}

export class GridLayout extends Layout {

    stageDims: Size;

    constructor(stageDims: Size) {
        super();
        this.stageDims = stageDims;
    }

    getVertexPositions(graph: Graph): PositionMap {
        const positions: PositionMap = new Map();
        const centerX = this.stageDims.width / 2;
        const centerY = this.stageDims.height / 2;
        const length = graph.getNumberOfVertices();
        const w = Math.ceil(Math.sqrt(length));
        const h = Math.ceil(length / w);
        const d = this.stageDims.height / 5;
        const originX = centerX - d * (w - 1) / 2;
        const originY = centerY - d * (h - 1) / 2;
        const vertexIds = graph.getVertexIds();
        let i = 0;
        for (const vId of vertexIds) {
            positions.set(vId, {
                x : originX + (i % w) * d,
                y : originY + Math.floor(i / w) * d
            });
            i += 1;
        }
        return positions;
    }

    isContinuous() {
        return false;
    }
}

export class BipartiteLayout extends Layout {
    constructor(private stageDims: Size) {
        super();
    }

    getVertexPositions(graph: Graph): PositionMap {
        const positions: PositionMap = new Map();
        const [w, h] = [this.stageDims.width, this.stageDims.height];
        const center = [ w / 2, h / 2];
        const left = new Set<number>();
        const right = new  Set<number>();
        type VertexAndDepth = Vector2;
        for (const v of graph.getVertexIds()) {
            if (left.has(v) || right.has(v)) {
                continue;
            }
            const q: VertexAndDepth[] = [[v, 0]];
            left.add(v);
            while (q.length > 0) {
                const [vertex, depth] = q.shift();
                const neighbors = graph.getVertexNeighborIds(vertex);
                for (const n of neighbors) {
                    if (left.has(n) || right.has(n)) {
                        continue;
                    }
                    ((depth % 2 == 0) ? right : left).add(n);
                    q.push([n, depth + 1]);
                }
            }
        }
        const hGap = w / 2;
        const vGap = 0.8 * h / Math.max(left.size, right.size);
        let i = 0;
        const lYStart = center[1] - ((left.size - 1) * vGap) / 2;
        const lX = center[0] - hGap / 2;
        for (const v of left) {
            positions.set(v, { x: lX, y: lYStart + i * vGap });
            i++;
        }
        i = 0;
        const rYStart = center[1] - ((right.size - 1) * vGap) / 2;
        const rX = center[0] + hGap / 2;
        for (const v of right) {
            positions.set(v, { x: rX, y: rYStart + i * vGap });
            i++;
        }
        return positions;
    }

    isContinuous() {
        return false;
    }
}

export class FixedLayout extends Layout {
    positions: PositionMap;

    constructor(positions: PositionMap) {
        super();
        this.positions = positions;
    }

    getVertexPositions(_: Graph): PositionMap {
        return this.positions;
    }

    isContinuous() {
        return false;
    }
}

export class ForceBasedLayout extends Layout {
    stageDims: Size;
    forces: {[vertexId: number]: Vector2};          // Actually velocities
    positions: PositionMap;

    private readonly C1 = 50;       // Attractive force factor
    private readonly C2 = 100;      // The no-force edge length
    private readonly C3 = 100000;   // Repulsive force factor
    private readonly C4 = 0.2;      // Position update factor

    constructor(stageDims: Size) {
        super();
        this.stageDims = stageDims;
        this.forces = {};
        this.positions = null;
    }

    // Computes the forces to be applied on each vertex
    private computeForces(graph: Graph) {
        // NOTE The algorithm implemented here is (section 12.2) from
        // http://cs.brown.edu/people/rtamassi/gdhandbook/chapters/force-directed.pdf
        const vertexIds: number[] = [...graph.getVertexIds()].sort();
        const positions = this.positions;
        for (let i = 0; i < vertexIds.length; i++) {
            const start = vertexIds[i];
            for (let j = i + 1; j < vertexIds.length; j++) {
                const end = vertexIds[j];
                const startPoint = positions.get(start);
                const endPoint = positions.get(end);
                const dist = Util.getDistanceFromPoints(positions.get(start),
                                                     positions.get(end));
                const d2 = Util.getDistanceSquaredFromPoints(positions.get(start),
                                                     positions.get(end));
                let forceMagnitude = 0;
                if (!graph.areNeighbors(start, end) && !graph.areNeighbors(end, start)) {
                    forceMagnitude = this.C3 / d2;
                } else {
                    // Negate because this force is attractive
                    forceMagnitude = - this.C1 * Math.log(dist / this.C2);
                }
                const directionVector: Vector2 = Util.getDirectionVectorNormalizedFromPoints(
                    startPoint, endPoint);

                const forceVector: Vector2 = Util.scalarVectorMultiply(
                    forceMagnitude, directionVector);
                this.forces[end] = Util.vectorAdd(this.forces[end],
                                                  forceVector);
                this.forces[start] = Util.vectorAdd(this.forces[start],
                                Util.scalarVectorMultiply(-1, forceVector));
            }
        }
    }

    private updatePositions() {
        for (const v of this.positions.keys()) {
            const force = Util.scalarVectorMultiply(this.C4, this.forces[v]);
            this.positions.set(v, Util.vectorToPoint(Util.vectorAdd(
                Util.pointToVector(this.positions.get(v)), force)));
        }
    }

    // Initialize forces to zero
    resetForces(graph: Graph) {
        this.forces = {};
        for (const v of graph.getVertexIds()) {
            this.forces[v] = [0, 0];
        }
    }

    getVertexPositions(graph: Graph): PositionMap {
        // Initially arrange them in a circular layout
        if (!this.positions) {
            this.positions = (new CircularLayout(this.stageDims)).getVertexPositions(graph);
        }
        this.resetForces(graph);
        this.computeForces(graph);
        this.updatePositions();
        return this.positions;
    }

    updateVertexPositions(graph: Graph, positions: PositionMap) {
        this.positions = positions;
        this.resetForces(graph);
        this.computeForces(graph);
        this.updatePositions();
    }

    isContinuous() {
        return true;
    }
}

export function getLayoutForStageDims(name: LayoutName, stageDims: Size)
        : Layout {
    if (name === "circular") {
        return new CircularLayout(stageDims);
    } else if (name == "bipartite") {
        return new BipartiteLayout(stageDims);
    } else if (name == "grid") {
        return new GridLayout(stageDims);
    } else if (name == "forcebased") {
        return new ForceBasedLayout(stageDims);
    } else {
        throw Error("Invalid layout name " + name);
    }
}

