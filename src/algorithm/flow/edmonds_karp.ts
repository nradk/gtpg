import { Algorithm, AlgorithmError } from "../algorithm";
import { SourceSinkInput } from "../../commontypes";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph, Weighted, Graph } from "../../graph_core/graph";
import { DecorationState } from "../../decoration/decorator";
import { getNumStringForLabels } from "../../util";

const l = getNumStringForLabels;

export class EdmondsKarpAlgorithm implements Algorithm<SourceSinkInput> {

    private source: number;
    private sink: number;

    constructor(private decorator: Decorator) {
    }

    private initialize(sourceAndSink: SourceSinkInput) {
        const graph = this.decorator.getGraph();
        if (!graph.isWeighted() || !graph.isDirected()) {
            throw new AlgorithmError("Edmonds-Karp algorithm needs a weighted directed graph!");
        }

        this.source = sourceAndSink.sourceId;
        this.sink = sourceAndSink.sinkId;
        for (const edge of graph.getEdgeList()) {
            this.setFlowLabel(edge[0], edge[1], 0);
        }
        this.decorator.setStatusLine("Setting all flows to 0");
    }

    private setFlowLabel(startV: number, endV: number, flow: number) {
        const weight = (this.decorator.getGraph() as Weighted & Graph).getEdgeWeight(startV, endV);
        this.decorator.setEdgeLabel(startV, endV, `${l(flow)}/${l(weight)}`);
    }

    private createFlowGraph(flow: Map<number, Map<number, number>>) {
        const graph = this.getDecorator().getGraph();
        const flowGraph = new WeightedGraph(true);
        for (const v of graph.getVertexIds()) {
            flowGraph.addVertex(v, graph.getVertexLabel(v));
        }
        for (const e of graph.getEdgeList()) {
            flowGraph.addEdge(e[0], e[1], flow.get(e[0]).get(e[1]));
        }
        return flowGraph;
    }

    *run(sourceAndSink: SourceSinkInput) {
        this.initialize(sourceAndSink);
        yield;
        const graph = this.decorator.getGraph() as Weighted & Graph;
        const cap = new Map<number, Map<number, number>>();
        const flow = new Map<number, Map<number, number>>();
        let totalFlow = 0;
        for (const e of graph.getEdgeList()) {
            if (!cap.has(e[0])) {
                cap.set(e[0], new Map());
            }
            if (!cap.has(e[1])) {
                cap.set(e[1], new Map());
            }
            if (!flow.has(e[0])) {
                flow.set(e[0], new Map());
            }
            if (!flow.has(e[1])) {
                flow.set(e[1], new Map());
            }
            cap.get(e[0]).set(e[1], e[2]);
            cap.get(e[1]).set(e[0], 0);
            flow.get(e[0]).set(e[1], 0);
            flow.get(e[1]).set(e[0], 0);
        }
        let i = 0;
        while (i < 10) {
            i += 1;
            const q = [this.source];
            const pred = new Map<number, number>();
            while (q.length > 0) {
                const curr = q.shift();
                for (const n of graph.getVertexNeighborIds(curr, true)) {
                    if (pred.get(n) == undefined && n != this.source &&
                        cap.get(curr).get(n) >  flow.get(curr).get(n)) {
                        pred.set(n, curr);
                        q.push(n);
                    }
                }
            }
            if (pred.get(this.sink) != undefined) {
                // An augmenting path exists
                const path = this.getPath(pred, this.sink);
                this.setPathState(path, DecorationState.CONSIDERING);
                this.decorator.setStatusLine("Augmenting path found");
                yield;
                let df = Infinity;
                let end = this.sink;
                let start = pred.get(end);
                while (start != undefined) {
                    df = Math.min(df, cap.get(start).get(end) - flow.get(start).get(end));
                    end = start;
                    start = pred.get(end);
                }
                this.decorator.setStatusLine("Sending flow of " + l(df));
                yield;
                // Update flow along the path
                end = this.sink;
                start = pred.get(end);
                while (start != undefined) {
                    flow.get(start).set(end, flow.get(start).get(end) + df);
                    // Reverse flow
                    flow.get(end).set(start, flow.get(end).get(start) - df);
                    this.setPathState(path, DecorationState.CONSIDERING);
                    if (graph.doesEdgeExist(start, end)) {
                        this.decorator.setEdgeState(start, end, DecorationState.SELECTED);
                        this.setFlowLabel(start, end, flow.get(start).get(end));
                    } else {
                        // This is a back edge, so reverse the order
                        this.decorator.setEdgeState(end, start, DecorationState.SELECTED);
                        this.setFlowLabel(end, start, flow.get(start).get(end));
                    }
                    yield;
                    end = start;
                    start = pred.get(end);
                }
                totalFlow = totalFlow + df;
                this.setPathState(path, DecorationState.DEFAULT);
            } else {
                break;
            }
        }
        this.decorator.setStatusLine("Total flow " + totalFlow);
        return {
            graph: this.createFlowGraph(flow),
            name: "Flow Graph",
            message: null
        };
    }

    private getPath(pred: Map<number, number>, sink: number) {
        const path = [sink];
        let end = sink;
        let start = pred.get(end);
        while (start != undefined) {
            path.splice(0, 0, start);
            end = start;
            start = pred.get(end);
        }
        return path;
    }

    private setPathState(path: number[], state: DecorationState) {
        const graph = this.decorator.getGraph();
        this.decorator.setVertexState(path[0], state);
        for (let i = 1; i < path.length; i++) {
            const start = path[i - 1];
            const end = path[i];
            this.decorator.setVertexState(end, state);
            if (graph.doesEdgeExist(start, end)) {
                this.decorator.setEdgeState(start, end, state);
            } else {
                // This is a back edge, so reverse the order
                this.decorator.setEdgeState(end, start, state);
            }
        }
    }


    getFullName() {
        return "Edmonds-Karp Maximum Network Flow Algorithm";
    }

    getShortName() {
        return "Edmonds-Karp";
    }

    getDecorator() {
        return this.decorator;
    }
}
