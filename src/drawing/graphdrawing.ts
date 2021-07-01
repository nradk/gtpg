import Konva from "konva";

import VertexDrawing from "./vertexdrawing";
import EdgeDrawing from "./edgedrawing";
import * as Graphs from "../graph_core/graph";
import { EuclideanGraph } from "../graph_core/euclidean_graph";
import * as Layouts from "../drawing/layouts";
import { getMouseEventXY } from "./util";
import { getLetterFromInteger, getTwoLevelKeyList } from "../util";
import { Vector2, Util, Point } from "../commontypes";
import { Decorator, DefaultDecorator, EuclideanDecorator } from "../decoration/decorator";
import { Tools } from "../ui_handlers/tools";

type CentroidCache = { n: number; xSum: number; ySum: number };

export type AutoLabelScheme = "abc" | "ABC" | "123";

interface AutoLabeler {
    nextLabel(): string;
    reset(): void;
}

function getAutoLabelerForScheme(scheme: AutoLabelScheme): AutoLabeler {
    switch (scheme) {
        case "abc":
        case "ABC":
            return new class implements AutoLabeler {
                protected nextCount: number = 0;
                nextLabel(): string {
                    this.nextCount += 1;
                    return getLetterFromInteger(this.nextCount, scheme == "ABC");
                }
                reset() {
                    this.nextCount = 0;
                }
            };
        case "123":
            return new class implements AutoLabeler {
                protected nextCount: number = 0;
                nextLabel(): string {
                    this.nextCount += 1;
                    return this.nextCount.toString();
                }
                reset() {
                    this.nextCount = 0;
                }
            };
    }
}

export class GraphDrawing {
    protected vertexDrawings : {[id: number]: VertexDrawing};
    // For undirected graphs, 'start' is always smaller than 'end'
    protected edgeDrawings : {[start: number]: { [end: number]: EdgeDrawing }};
    protected graph : Graphs.Graph;
    protected selectedVertex : VertexDrawing;
    protected stage : Konva.Stage;
    protected verticesLayer : Konva.Layer;
    protected edgesLayer : Konva.Layer;
    protected continuousLayoutTimer: number;
    protected positions: Layouts.PositionMap;
    protected vertexRadius: number;
    protected vertexSelectMode: boolean = false;
    protected tools: Tools;

    protected autoLabelScheme: AutoLabelScheme = "123";
    protected labelers: {[scheme in AutoLabelScheme]: AutoLabeler} = {
        "123": getAutoLabelerForScheme("123"),
        "abc": getAutoLabelerForScheme("abc"),
        "ABC": getAutoLabelerForScheme("ABC"),
    };

    protected centroidCache: CentroidCache;

    protected constructor(graph?: Graphs.Graph) {
        if (graph === undefined) {
            this.graph = new Graphs.UnweightedGraph(false);
        } else {
            this.graph = graph;
        }
        this.vertexDrawings = {};
        this.positions = new Map();
        this.verticesLayer = new Konva.Layer();
        this.edgesLayer = new Konva.Layer();
        this.vertexRadius = 15;

        this.centroidCache = {
            n: this.graph.getNumberOfVertices(),
            xSum: 0, ySum: 0
        };
    }

    static create(forGraph?: Graphs.Graph): GraphDrawing {
        if (forGraph == undefined) {
            return new GraphDrawing();
        }
        if (forGraph instanceof EuclideanGraph) {
            return new EuclideanGraphDrawing(forGraph);
        } else {
            return new GraphDrawing(forGraph);
        }
    }

    setEnvironment(stage: Konva.Stage, tools: Tools): void {
        this.stage = stage;
        this.tools = tools;
        this.stage.removeChildren();
        this.stage.add(this.edgesLayer).add(this.verticesLayer);
        this.stage.on('click', e => {
            if (!this.vertexSelectMode && e.target === this.stage) {
                this.addVertexToCurrentGraph(e);
            }
        });
    }

    renderGraph(layout?: Layouts.Layout) {
        if (!this.stage) {
            throw Error("Stage needs to be set before call to renderGraph()");
        }

        this.edgesLayer.removeChildren();
        this.verticesLayer.removeChildren();

        if (Object.keys(this.vertexDrawings).length == 0 || layout != undefined) {
            // If no vertices present and no layout given, use empty layout
            this.layoutWithoutRender(layout ?? new Layouts.EmptyLayout());
        }

        // Add edgedrawings and vertexdrawings to their respective layers
        Object.keys(this.vertexDrawings).forEach(k => this.verticesLayer.add(
            this.vertexDrawings[k]));
        for (const s of Object.keys(this.edgeDrawings)) {
            for (const e of Object.keys(this.edgeDrawings[s])) {
                this.edgesLayer.add(this.edgeDrawings[s][e]);
            }
        }

        // Draw both layers (necessary for the added objects to actually be
        // visible)
        this.edgesLayer.draw();
        this.verticesLayer.draw();

        if (this.continuousLayoutTimer != undefined) {
            window.clearInterval(this.continuousLayoutTimer);
            this.continuousLayoutTimer = undefined;
        }
        if (layout != undefined && layout.isContinuous()) {
            this.continuousLayoutTimer = window.setInterval(() => {
                layout.updateVertexPositions(this.graph, this.positions);
                this.redrawGraph(layout);
            }, 40);
        }
    }

    layoutWithoutRender(layout: Layouts.Layout) {
        // edge drawigns must be populated AFTER vertex drawings
        // because edge drawings store a reference to their start
        // and end vertex drawings
        this.populateVertexDrawings(layout);
        this.populateEdgeDrawings();
        this.attachVertexEventHandlers();
    }

    // This is a "shallow" render, just update positions from the layout and
    // update the vertex and edge positions
    redrawGraph(layout: Layouts.Layout) {
        layout.updateVertexPositions(this.graph, this.positions);
        for (const v of this.positions.keys()) {
            const drawing: VertexDrawing = this.vertexDrawings[v];
            drawing.x(this.positions.get(v).x);
            drawing.y(this.positions.get(v).y);
            drawing.callMoveCallbacks()
        }
        this.verticesLayer.draw();
        this.edgesLayer.draw();
    }

    setVertexRadius(radius: number) {
        this.vertexRadius = radius;
        Object.values(this.vertexDrawings).forEach(vd => vd.setRadius(radius));
        this.verticesLayer.draw();
    }

    getVertexRadius(): number {
        return this.vertexRadius;
    }

    populateVertexDrawings(layout: Layouts.Layout) {
        this.positions = layout.getVertexPositions(this.graph);
        this.vertexDrawings = {};
        for (const v of this.positions.keys()) {
            const p = this.positions.get(v);
            this.centroidCache.xSum += p.x;
            this.centroidCache.ySum += p.y;
            this.vertexDrawings[v] = new VertexDrawing(p.x, p.y,
                this.vertexRadius, this, v);
        }
    }

    attachVertexEventHandlers() {
        for (const v of Object.keys(this.vertexDrawings)) {
            this.vertexDrawings[v].addClickCallback(
                this.vertexClickHandler.bind(this));
            this.vertexDrawings[v].addMoveCallback(
                this.vertexMoveHandler.bind(this));
        }
    }

    // Assume vertices already drawn
    populateEdgeDrawings() {
        const edges = this.graph.getEdgeList();
        this.edgeDrawings = {};
        for (const e of edges) {
            if (!(e[0] in this.edgeDrawings)) {
                this.edgeDrawings[e[0]] = {};
            }
            this.edgeDrawings[e[0]][e[1]] = this.createEdgeDrawing(e[0], e[1]);
        }
    }

    createEdgeDrawing(startId: number, endId: number) {
        const start = this.vertexDrawings[startId];
        const end   = this.vertexDrawings[endId];
        return  new EdgeDrawing(this, start, end,
                this.graph.isDirected(),
                this.edgesLayer.draw.bind(this.edgesLayer),
                this.graph instanceof Graphs.WeightedGraph ?
                    this.graph.getEdgeWeight(startId, endId) : undefined,
                this.handleWeightUpdate.bind(this)
        );
    }

    getWeightOffset(start: VertexDrawing, end: VertexDrawing): Vector2 {
        const centroidPt = Util.vectorToPoint(this.getCentroid());
        const startV: Vector2 = [start.x(), start.y()];
        const endV: Vector2 = [end.x(), end.y()];
        const centroidOnRight =
            (end.y() - start.y()) * (centroidPt.x - start.x()) >
            (centroidPt.y - start.y()) * (end.x() - start.x());
        const dirVec = Util.getDirectionVectorNormalized(startV, endV);
        const m = centroidOnRight ? -1 : 1;
        const orthDirVec: Vector2 = [dirVec[1] / m , -dirVec[0] / m];
        return Util.scalarVectorMultiply(15, orthDirVec);
    }

    protected getNextUniqueLabel(): string {
        const labels = new Set<string>(this.graph.getAllVertexLabels().values());
        let next: string;
        do {
            next = this.labelers[this.autoLabelScheme].nextLabel();
        } while (labels.has(next));
        return next;
    }

    addVertexToCurrentGraph(e: Konva.KonvaEventObject<MouseEvent>) {
        // TODO:::::
        // WARNING: BAD HACK! We check to see if the stage has it's 'draggable'
        // property disabled, because EditableText disables stage dragging when
        // editing is active and we want to cancel the edit without adding a
        // new vertex when the user clicks outside the EditableText.
        if (!this.stage.draggable()) {
            return;
        }
        if (this.getTools().getCurrentTool() != "default") {
            return;
        }
        const [x, y] = getMouseEventXY(e);
        const newId = this.graph.addVertex();
        this.graph.setVertexLabel(newId, this.getNextUniqueLabel());
        const drawing = new VertexDrawing(x, y, this.vertexRadius, this, newId);
        this.vertexDrawings[newId] = drawing;
        this.positions.set(newId, {x: x, y: y});
        drawing.addClickCallback(this.vertexClickHandler.bind(this));
        this.verticesLayer.add(drawing);
        this.verticesLayer.draw();

        this.centroidCache.n += 1;
        this.centroidCache.xSum += x;
        this.centroidCache.ySum += y;
    }

    vertexMoveHandler(vertex: VertexDrawing) {
        const vid = vertex.getVertexId();
        this.centroidCache.xSum -= this.positions.get(vid).x;
        this.centroidCache.ySum -= this.positions.get(vid).y;

        this.positions.set(vid, {x: vertex.x(), y: vertex.y()});

        this.centroidCache.xSum += this.positions.get(vid).x;
        this.centroidCache.ySum += this.positions.get(vid).y;

        // Notify neighbors so they can update their label positions
        for (const n of this.graph.getVertexNeighborIds(vid, true)) {
            this.vertexDrawings[n].updateExternalLabelPosition();
        }
    }

    vertexClickHandler(vertexDrawing: VertexDrawing) {
        if (this.vertexSelectMode) {
            // TODO this should be made into a tool
            // If we are in 'vertex select mode', vertex click is handled
            // elsewhere. We do nothing here.
            return;
        }
        if (this.tools.getCurrentTool() == "delete") {
            this.deleteVertex(vertexDrawing);
        } else if (this.tools.getCurrentTool() == "default") {
            if (this.selectedVertex) {
                this.selectedVertex.unselect();
                if (this.selectedVertex === vertexDrawing) {
                    this.selectedVertex = null;
                    return;
                }

                this.addEdge(this.selectedVertex, vertexDrawing);
                this.selectedVertex = null;
            } else {
                if (vertexDrawing.isSelected()) {
                    vertexDrawing.unselect();
                    this.selectedVertex = null;
                } else {
                    vertexDrawing.select();
                    this.selectedVertex = vertexDrawing;
                }
            }
        } // Do nothing for 'text' tool
        this.verticesLayer.draw();
    }

    protected deleteVertex(vertexDrawing: VertexDrawing) {
        if (vertexDrawing === this.selectedVertex) {
            // Unset the selected vertex if it is going to be deleted
            this.selectedVertex = null;
        }
        for (const edge of vertexDrawing.getEdgeDrawings()) {
            edge.destroy();
        }
        // TODO remove edge drawing from this.edgeDrawings
        const vertexId = this.lookupVertexId(vertexDrawing)
        this.graph.removeVertex(vertexId);
        vertexDrawing.destroy();
        delete this.vertexDrawings[vertexId];
        this.positions.delete(vertexId);
        this.verticesLayer.draw();
        this.edgesLayer.draw();

        this.centroidCache.n -= 1;
        this.centroidCache.xSum -= vertexDrawing.x();
        this.centroidCache.ySum -= vertexDrawing.y();
    }

    lookupVertexId(vertexDrawing: VertexDrawing): number {
        const m = this.vertexDrawings;
        return parseInt(Object.keys(m).find(key => m[key] === vertexDrawing));
    }

    protected addEdge(start: VertexDrawing, end: VertexDrawing) {
        const startId = this.lookupVertexId(start);
        const endId = this.lookupVertexId(end);
        if (this.graph.doesEdgeExist(startId, endId)) {
            return;
        }
        this.graph.addEdge(startId, endId);
        const edgeDrawing = this.createEdgeDrawing(startId, endId);
        this.storeAndShowEdgeDrawing(edgeDrawing, startId, endId);
    }

    storeAndShowEdgeDrawing(edgeDrawing: EdgeDrawing, startId: number, endId: number) {
        // The order is important because graph.getEdgeList() returns only
        // (m,n) edges where m < n. We conform to that here.
        if (startId < endId) {
            if (!(startId in this.edgeDrawings)) {
                this.edgeDrawings[startId] = {};
            }
            this.edgeDrawings[startId][endId] = edgeDrawing;
        } else {
            if (!(endId in this.edgeDrawings)) {
                this.edgeDrawings[endId] = {};
            }
            this.edgeDrawings[endId][startId] = edgeDrawing;
        }
        this.edgesLayer.add(edgeDrawing);
        this.edgesLayer.draw();
    }

    removeEdge(start: VertexDrawing, end: VertexDrawing) {
        const startId = this.lookupVertexId(start);
        const endId = this.lookupVertexId(end);
        this.removeEdgeDrawing(startId, endId);
        this.graph.removeEdge(startId, endId);
    }

    removeEdgeDrawing(startId: number, endId: number) {
        const start = this.vertexDrawings[startId];
        const end = this.vertexDrawings[endId];
        for (const edgeDrawing of start.getEdgeDrawings()) {
            const endIndex = end.getEdgeDrawings().indexOf(edgeDrawing);
            if (endIndex >= 0) {
                start.unregisterEdgeDrawing(edgeDrawing);
                end.unregisterEdgeDrawing(edgeDrawing);
                edgeDrawing.destroy();
                this.edgesLayer.draw();
                delete this.edgeDrawings[startId][endId];
                return;
            }
        }
        throw new Error("No edge drawing exists between the given vertices!");
    }

    getEdgeDrawingKeyList() {
        return getTwoLevelKeyList(this.edgeDrawings);
    }

    toJsonString(): string {
        const pobj: {[v: number]: Point} = {};
        for (const v of Object.keys(this.vertexDrawings)) {
            pobj[v] = {x: this.vertexDrawings[v].x(),
                y: this.vertexDrawings[v].y()
            };
        }
        const edges = this.getEdgeDrawingKeyList();
        const curvePointPositions: {[v1: number]: {[v2: number]: Vector2}} = {};
        for (const edge of edges) {
            const edgeDrawing = this.edgeDrawings[edge[0]][edge[1]];
            if (!(edge[0] in curvePointPositions)) {
                curvePointPositions[edge[0]] = {};
            }
            curvePointPositions[edge[0]][edge[1]] = edgeDrawing.getCurvePointPosition();
        }
        return JSON.stringify({
            graph: this.graph,
            vertexPositions: pobj,
            curvePointPositions: curvePointPositions
        });
    }

    static fromJsonString(jsonStr: string): GraphDrawing {
        const data: {
            graph: string,
            vertexPositions: Layouts.PositionMap,
            curvePointPositions: {[v1: number]: {[v2: number]: Vector2}}
        } = JSON.parse(jsonStr);
        const entries = Object.entries(data.vertexPositions);
        const positions: Layouts.PositionMap =
            new Map(entries.map(([key, value]) => [parseInt(key), value]));
        const gd = GraphDrawing.create(Graphs.fromJsonObject(data.graph));
        const layout = new Layouts.FixedLayout(positions);
        gd.layoutWithoutRender(layout);
        const edgeList = getTwoLevelKeyList(data.curvePointPositions);
        for (const edge of edgeList) {
            const ed = gd.getEdgeDrawing(edge[0], edge[1]);
            const curvePointPosition = data.curvePointPositions[edge[0]][edge[1]];
            if (curvePointPosition != undefined) {
                ed.setCurvePointPosition(curvePointPosition);
            }
        }
        return gd;
    }

    detachStage() {
        if (this.continuousLayoutTimer != undefined) {
            window.clearInterval(this.continuousLayoutTimer);
            this.continuousLayoutTimer = undefined;
        }
        this.stage.off('click');
    }

    getEdgeDrawing(startVertexId: number, endVertexId: number): EdgeDrawing {
        return this.edgeDrawings[startVertexId]?.[endVertexId];
    }

    getCentroid(): Vector2 {
        const n = this.centroidCache.n;
        return [this.centroidCache.xSum / n, this.centroidCache.ySum / n];;
    }

    handleWeightUpdate(start: VertexDrawing, end: VertexDrawing, weight: number) {
        let startId = this.lookupVertexId(start);
        let endId = this.lookupVertexId(end);
        //if (!this.graph.isDirected() && startId > endId) {
            //let t = endId;
            //endId = startId;
            //startId = t;
        //}
        if (this.graph instanceof Graphs.WeightedGraph) {
            this.graph.setEdgeWeight(startId, endId, weight);
        }
    }

    getGraph(): Graphs.Graph {
        return this.graph;
    }

    getDecorator(): Decorator {
        return new DefaultDecorator(this);
    }

    getVertexPositions(): Layouts.PositionMap {
        return this.positions;
    }

    getVertexDrawings() {
        return this.vertexDrawings;
    }

    getEdgeDrawings() {
        return this.edgeDrawings;
    }

    getStage(): Konva.Stage {
        return this.stage;
    }

    getTools(): Tools {
        return this.tools;
    }

    enterVertexSelectMode(): Promise<number> {
        this.vertexSelectMode = true;
        this.stage.container().style.cursor = 'crosshair';
        return new Promise<number>((resolve, reject) => {
            this.stage.on('click', e => {
                this.vertexSelectMode = false;
                this.stage.container().style.cursor = 'default';
                let target: any = e.target;
                while (target) {
                    if (target instanceof VertexDrawing) {
                        resolve(target.getVertexId());
                        return;
                    }
                    target = target.parent;
                }
                reject();
            });
        });
    }

    getEdgeDrawingOrder(aVertexId: number, bVertexId: number):
    [number, number] {
        if (bVertexId in this.edgeDrawings &&
            aVertexId in this.edgeDrawings[bVertexId]) {
            return [bVertexId, aVertexId];
        } else if (aVertexId in this.edgeDrawings &&
            bVertexId in this.edgeDrawings[aVertexId]) {
            return [aVertexId, bVertexId];
        } else {
            return null;
        }
    }

    setAutoLabelScheme(scheme: AutoLabelScheme) {
        this.autoLabelScheme = scheme;
    }

    getAutoLabelScheme(): AutoLabelScheme {
        return this.autoLabelScheme;
    }
}

export class EuclideanGraphDrawing extends GraphDrawing {

    constructor(graph: EuclideanGraph) {
        super(graph);
    }

    populateEdgeDrawings() {
        this.edgeDrawings = {};
    }

    getDecorator() {
        return new EuclideanDecorator(this);
    }
}
