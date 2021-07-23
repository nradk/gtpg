import Konva from "konva";

import VertexDrawing from "./vertexdrawing";
import EdgeDrawing from "./edgedrawing";
import * as Graphs from "../graph_core/graph";
import { EuclideanGraph } from "../graph_core/euclidean_graph";
import * as Layouts from "../drawing/layouts";
import { getMouseEventXY } from "./util";
import { getLetterFromInteger, getTwoLevelKeyList } from "../util";
import { Vector2, Util, Point, NoVertexClickedError } from "../commontypes";
import { Decorator, DefaultDecorator, EuclideanDecorator, StatusSink } from "../decoration/decorator";
import { Tools } from "../ui_handlers/tools";
import { showInfo, showWarning } from "../ui_handlers/notificationservice";
import { getNumStringForLabels } from "../util";

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
    // Set true to see vertex centroid. Useful for debugging edge labels.
    private static readonly SHOW_CENTROID = false;

    protected vertexDrawings : {[id: number]: VertexDrawing};
    // For undirected graphs, 'start' is always smaller than 'end'
    protected edgeDrawings : {[start: number]: { [end: number]: EdgeDrawing }};
    protected graph : Graphs.Graph;
    protected selectedVertex : VertexDrawing;
    protected stage : Konva.Stage;
    protected dragPosition: Point;
    protected verticesLayer : Konva.Layer;
    protected edgesLayer : Konva.Layer;
    protected continuousLayoutTimer: number;
    protected positions: Layouts.PositionMap;
    protected vertexRadius: number;
    protected weightFontSize: number;
    protected vertexSelectMode: boolean = false;
    protected tools: Tools;
    protected graphEditCallback: () => void;
    protected centroidDot: Konva.Circle;

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
        this.weightFontSize = 10;
        this.dragPosition = { x: 0, y: 0};

        this.centroidCache = {
            n: this.graph.getNumberOfVertices(),
            xSum: 0, ySum: 0
        };
        const centroid = this.getCentroid();
        this.centroidDot = new Konva.Circle({
            fill: 'red',
            stroke: 'red',
            radius: 3,
            visible: GraphDrawing.SHOW_CENTROID,
            x: centroid[0],
            y: centroid[1]
        });
    }

    private updateDotPosition() {
        const centroid = this.getCentroid();
        this.centroidDot.x(centroid[0]);
        this.centroidDot.y(centroid[1]);
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

    attachStage(stage: Konva.Stage, tools: Tools): void {
        this.stage = stage;
        this.tools = tools;
        this.stage.removeChildren();
        this.stage.add(this.edgesLayer).add(this.verticesLayer);
        this.stage.on('click.addvertex', e => {
            if (!this.vertexSelectMode && e.target === this.stage
                && this.tools.getCurrentTool() == "default") {
                this.addVertexToCurrentGraph(e);
            }
        });
        this.stage.x(this.dragPosition.x);
        this.stage.y(this.dragPosition.y);
        this.stage.on('dragend.rememberpos', () => {
            this.dragPosition = { x: stage.x(), y: stage.y() };
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
        this.verticesLayer.add(this.centroidDot);

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
    redrawGraph(layout?: Layouts.Layout) {
        layout?.updateVertexPositions(this.graph, this.positions);
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

    setWeightFontSize(size: number) {
        this.weightFontSize = size;
        const edgeKeys = this.getEdgeDrawingKeyList();
        for (const key of edgeKeys) {
            const edgeDrawing = this.getEdgeDrawings()[key[0]][key[1]];
            edgeDrawing.setLabelFontSize(size);
        }
        this.edgesLayer.draw();
    }

    getWeightFontSize(): number {
        return this.weightFontSize;
    }

    protected populateVertexDrawings(layout: Layouts.Layout) {
        // TODO find a more elegant way to do this
        // Don't replace the positions object because in the special case of
        // the Euclidean Graph, the positions object is shared with the graph
        // itself.
        layout.updateVertexPositions(this.graph, this.positions);
        this.vertexDrawings = {};
        for (const v of this.positions.keys()) {
            const p = this.positions.get(v);
            this.centroidCache.xSum += p.x;
            this.centroidCache.ySum += p.y;
            this.vertexDrawings[v] = new VertexDrawing(p.x, p.y,
                this.vertexRadius, this, v);
        }
        this.updateDotPosition();
    }

    private attachVertexEventHandlers() {
        for (const v of Object.keys(this.vertexDrawings)) {
            this.vertexDrawings[v].addClickCallback(
                this.vertexClickHandler.bind(this));
            this.vertexDrawings[v].addMoveCallback(
                this.vertexMoveHandler.bind(this));
        }
    }

    // Assume vertices already drawn
    protected populateEdgeDrawings() {
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
        const weight = !this.graph.isWeighted() ? undefined :
            getNumStringForLabels((this.graph as Graphs.Weighted & Graphs.Graph)
                .getEdgeWeight(startId, endId));
        const edgeDrawing = new EdgeDrawing(this, start, end,
            this.graph.isDirected(),
            this.edgesLayer.draw.bind(this.edgesLayer),
            weight,
            this.graph instanceof Graphs.WeightedGraph ?
            this.handleWeightUpdate.bind(this) : undefined
        );
        edgeDrawing.setLabelFontSize(this.weightFontSize);
        return edgeDrawing;
    }

    setWeightAsEdgeLabel(startId: number, endId: number) {
        if (!this.getGraph().isWeighted()) {
            return;
        }
        const graph = this.getGraph() as Graphs.Graph & Graphs.Weighted;
        const weight = graph.getEdgeWeight(startId, endId);
        const weightStr = getNumStringForLabels(weight);
        const order = this.getEdgeDrawingOrder(startId, endId);
        this.getEdgeDrawing(order[0], order[1]).setEdgeLabel(weightStr,
            this.handleWeightUpdate.bind(this));
    }

    getEdgeLabelOffset(start: VertexDrawing, end: VertexDrawing): Vector2 {
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

    protected addVertexToCurrentGraph(e: Konva.KonvaEventObject<MouseEvent>): VertexDrawing {
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
        drawing.addMoveCallback(this.vertexMoveHandler.bind(this));
        this.vertexDrawings[newId] = drawing;
        this.positions.set(newId, {x: x, y: y});
        drawing.addClickCallback(this.vertexClickHandler.bind(this));
        this.verticesLayer.add(drawing);
        this.verticesLayer.draw();

        this.graphEditCallback?.();
        this.centroidCache.n += 1;
        this.centroidCache.xSum += x;
        this.centroidCache.ySum += y;
        this.updateDotPosition();
        return drawing;
    }

    protected updateVertexPosition(vertex: VertexDrawing) {
        const vid = vertex.getVertexId();
        const oldPosition = this.positions.get(vid);
        const newPosition = {x: vertex.x(), y: vertex.y()};
        this.positions.set(vid, newPosition);
        this.updateCentroidCache(oldPosition, newPosition);
    }

    protected vertexMoveHandler(vertex: VertexDrawing) {
        const vid = vertex.getVertexId();
        this.updateVertexPosition(vertex);
        // Notify neighbors so they can update their label positions
        for (const n of this.graph.getVertexNeighborIds(vid, true)) {
            this.vertexDrawings[n].updateExternalLabelPosition();
        }
    }

    protected updateCentroidCache(oldPosition: Point, newPosition: Point) {
        this.centroidCache.xSum -= oldPosition.x;
        this.centroidCache.ySum -= oldPosition.y;

        this.centroidCache.xSum += newPosition.x;
        this.centroidCache.ySum += newPosition.y;
        this.updateDotPosition();
    }

    protected vertexClickHandler(vertexDrawing: VertexDrawing) {
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
        const id = vertexDrawing.getVertexId();
        for (const n of this.graph.getVertexNeighborIds(id, true)) {
            this.removeEdgeByIds(id, n, false);
        }
        this.graph.removeVertex(id);
        vertexDrawing.destroy();
        delete this.vertexDrawings[id];
        this.positions.delete(id);
        this.verticesLayer.draw();
        this.edgesLayer.draw();

        this.graphEditCallback?.();
        this.centroidCache.n -= 1;
        this.centroidCache.xSum -= vertexDrawing.x();
        this.centroidCache.ySum -= vertexDrawing.y();
        this.updateDotPosition();
    }

    protected addEdge(start: VertexDrawing, end: VertexDrawing) {
        const startId = start.getVertexId();
        const endId = end.getVertexId();
        if (this.graph.doesEdgeExist(startId, endId)) {
            return;
        }
        this.graph.addEdge(startId, endId);
        const edgeDrawing = this.createEdgeDrawing(startId, endId);
        this.storeAndShowEdgeDrawing(edgeDrawing, startId, endId);
        this.graphEditCallback?.();
    }

    storeAndShowEdgeDrawing(edgeDrawing: EdgeDrawing, startId: number, endId: number) {
        // For undirected graphs too, the order is important because
        // graph.getEdgeList() returns only (m,n) edges where m < n. We conform
        // to that here.
        if (startId < endId || this.graph.isDirected()) {
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

    removeEdge(start: VertexDrawing, end: VertexDrawing, draw?: boolean) {
        const startId = start.getVertexId();
        const endId = end.getVertexId();
        this.removeEdgeByIds(startId, endId, draw);
    }

    protected removeEdgeByIds(startId: number, endId: number, draw?: boolean) {
        this.removeEdgeDrawing(startId, endId, draw);
        this.graph.removeEdge(startId, endId);
        this.graphEditCallback?.();
    }

    removeEdgeDrawing(startId: number, endId: number, draw?: boolean) {
        draw = draw ?? true;
        const orderedEdge = this.getEdgeDrawingOrder(startId, endId);
        if (orderedEdge == null) {
            throw new Error("No edge drawing exists between the given vertices!");
        }
        [startId, endId] = orderedEdge;
        const edgeDrawing = this.edgeDrawings[startId][endId];
        edgeDrawing.remove();
        edgeDrawing.destroy();
        if (draw) {
            this.edgesLayer.draw();
        }
        delete this.edgeDrawings[startId][endId];
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
            curvePointPositions: curvePointPositions,
            dragPosition: this.dragPosition
        });
    }

    static fromJsonString(jsonStr: string): GraphDrawing {
        const data: {
            graph: string,
            vertexPositions: Layouts.PositionMap,
            curvePointPositions: {[v1: number]: {[v2: number]: Vector2}},
            dragPosition: Point
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
        gd.dragPosition = data.dragPosition ?? { x: 0, y: 0 };
        return gd;
    }

    detachStage() {
        if (this.continuousLayoutTimer != undefined) {
            window.clearInterval(this.continuousLayoutTimer);
            this.continuousLayoutTimer = undefined;
        }
        this.stage.off('click.addvertex');
        this.stage.off('dragend.rememberpos');
    }

    getEdgeDrawing(startVertexId: number, endVertexId: number): EdgeDrawing {
        return this.edgeDrawings[startVertexId]?.[endVertexId];
    }

    // Returns (0, 0) if no vertices exist
    getCentroid(): Vector2 {
        const n = this.centroidCache.n;
        if (n == 0) {
            return [0, 0];
        }
        return [this.centroidCache.xSum / n, this.centroidCache.ySum / n];;
    }

    protected handleWeightUpdate(edgeDrawing: EdgeDrawing, weightStr: string) {
        let startId = edgeDrawing.start.getVertexId();
        let endId = edgeDrawing.end.getVertexId();
        const weight = Number(weightStr);
        if (!this.graph.isWeighted()) {
            console.error("Attempt to edit weight in a non-weighted graph!");
            return false;
        }
        if (isNaN(weight)) {
            console.warn("Cannot set a non-numeric weight!");
            showWarning("Warning", "Weight must be numeric!");
            return false;
        }
        (this.graph as Graphs.Graph & Graphs.Weighted).setEdgeWeight(startId,
            endId, weight);
        return true;
    }

    getGraph(): Graphs.Graph {
        return this.graph;
    }

    getDecorator(statusSink: StatusSink): Decorator {
        return new DefaultDecorator(this, statusSink);
    }

    getVertexPosition(vertexId: number): Point {
        return this.positions.get(vertexId);
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

    enterVertexSelectMode(messageTitle: string, messageBody: string): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            showInfo(messageTitle, messageBody);
            this.vertexSelectMode = true;
            const prevCursor = this.stage.container().style.cursor;
            this.stage.container().style.cursor = 'crosshair';
            this.stage.on('click.vertexSelect', e => {
                this.vertexSelectMode = false;
                this.stage.off('click.vertexSelect');
                this.stage.container().style.cursor = prevCursor;
                let target: any = e.target;
                while (target) {
                    if (target instanceof VertexDrawing) {
                        resolve(target.getVertexId());
                        return;
                    }
                    target = target.parent;
                }
                showWarning("No Vertex", "Did not detect a click on any vertex.");
                reject(new NoVertexClickedError());
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

    setGraphEditCallback(onGraphEdit: () => void) {
        this.graphEditCallback = onGraphEdit;
    }
}

export class EuclideanGraphDrawing extends GraphDrawing {

    constructor(graph: EuclideanGraph) {
        super(graph);
        this.positions = graph.getPositions();
    }

    protected populateVertexDrawings(layout: Layouts.Layout) {
        super.populateVertexDrawings(layout);
        for (const v of Object.keys(this.vertexDrawings)) {
            this.vertexDrawings[v].setExternalLabelPlacement("anti-centroid");
        }
    }

    protected vertexMoveHandler(vertex: VertexDrawing) {
        this.updateVertexPosition(vertex);
    }

    protected addVertexToCurrentGraph(e: Konva.KonvaEventObject<MouseEvent>) {
        const vd = super.addVertexToCurrentGraph(e);
        vd.setExternalLabelPlacement("anti-centroid");
        return vd;
    }

    protected deleteVertex(vertexDrawing: VertexDrawing) {
        if (vertexDrawing === this.selectedVertex) {
            // Unset the selected vertex if it is going to be deleted
            this.selectedVertex = null;
        }
        const id = vertexDrawing.getVertexId();
        if (this.edgeDrawings[id]) {
            for (const n in this.edgeDrawings[id]) {
                this.removeEdgeDrawing(id, parseInt(n));
            }
        }
        for (const v in this.edgeDrawings) {
            if (this.edgeDrawings[v][id]) {
                this.removeEdgeDrawing(parseInt(v), id);
            }
        }
        this.graph.removeVertex(id);
        vertexDrawing.destroy();
        delete this.vertexDrawings[id];
        this.verticesLayer.draw();
        this.edgesLayer.draw();

        this.graphEditCallback?.();
        this.centroidCache.n -= 1;
        this.centroidCache.xSum -= vertexDrawing.x();
        this.centroidCache.ySum -= vertexDrawing.y();
    }

    protected populateEdgeDrawings() {
        this.edgeDrawings = {};
    }

    getDecorator(statusSink: StatusSink) {
        return new EuclideanDecorator(this, statusSink);
    }
}
