import { Heap } from 'heap-js';

import { Algorithm, AlgorithmState } from "../algorithm";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph } from "../../graph_core/graph";

export class PrimMST extends Algorithm {

    step: () => void;
    timer: ReturnType<typeof setTimeout>;
    state: AlgorithmState;
    stateChangeCallback: (newState: AlgorithmState) => void;
    delay: number;
    decorator: Decorator;
    mst: WeightedGraph;

    constructor(decorator: Decorator) {
        super(decorator);
        this.state = "init";
        this.delay = 400;
    }

    execute() {
        const g = this.decorator.getGraph();
        if (!(g instanceof WeightedGraph) || g.isDirected()) {
            console.warn("Prim: weighted undirected graph required!");
            alert("Prim's algorithm needs a weighted undirected graph!");
            return;
        }
        this.setState("running");
        const graph = g as WeightedGraph;
        this.mst = new WeightedGraph(false)
        const vertexIds = graph.getVertexIds();
        for (const v of vertexIds) {
            this.mst.addVertex(v);
        }

        const edgeComparator = (a: number[], b: number[]) => a[2] - b[2];
        const edgeQ = new Heap(edgeComparator);

        const firstVertex = vertexIds[Math.floor(
            Math.random() * vertexIds.length)];

        const inTree: Set<number> = new Set();
        inTree.add(firstVertex);

        for (const n of graph.getVertexNeighborIds(firstVertex)) {
            if (!inTree.has(n)) {
                edgeQ.push([firstVertex, n, graph.getEdgeWeight(firstVertex, n)]);
            }
        }

        const notInTree: Set<number> = new Set();
        for (const v of vertexIds) {
            if (v == firstVertex) {
                // Select the initial vertex
                this.decorator.setVertexState(v, "selected");
            } else {
                // Add other vertices to the not-in-tree set
                notInTree.add(v);
                // Disable all other vertices
                this.decorator.setVertexState(v, "disabled");
            }
        }

        // Disable all edges
        for (const edge of graph.getEdgeList()) {
            this.decorator.setEdgeState(edge[0], edge[1], "disabled");
        }

        console.log("graph:", graph.adjacencyMap);

        this.step = () => {
            const edge = edgeQ.pop();
            const [inside, outside, weight] = edge;
            if (!inTree.has(outside)) {
                this.mst.addEdge(inside, outside, weight);
                console.log(`Adding edge ${inside}, ${outside} to mst`);
                this.decorator.setEdgeState(inside, outside, "selected");
                this.decorator.setVertexState(outside, "selected");
                notInTree.delete(outside);
                inTree.add(outside);

                for (const n of graph.getVertexNeighborIds(outside)) {
                    if (!inTree.has(n)) {
                        console.log(`Adding edge ${outside}, ${n} to queue`);
                        edgeQ.add([outside, n, graph.getEdgeWeight(outside, n)]);
                        // this.decorator.setEdgeState(outside, n, "default");
                    }
                }
            }

            if (notInTree.size == 0) {
                this.setState("done");
                clearTimeout(this.timer);
            } else if (this.getState() == "running") {
                this.timer = setTimeout(this.step, this.delay);
            }
        };
        this.timer = setTimeout(this.step, this.delay);
    }

    private setState(state: AlgorithmState) {
        this.state = state;
        this.stateChangeCallback?.(this.state);
    }

    pause() {
        this.setState("paused");
    }

    resume() {
        if (this.state != "paused") {
            throw new Error("Algorithm resumed when it wasn't in a paused state.");
        }
        this.setState("running");
        this.timer = setTimeout(this.step, this.delay);
    }

    stop() {
        this.setState("init");
    }

    setSpeed(speed: number) {
        // speed can go from 0 to 100
        // That corresponds to a delay from 2s to 10ms
        this.delay = 10 + (2000 - 10) * (1 - speed / 100);
    }

    getState(): AlgorithmState {
        return this.state;
    }

    setStateChangeCallback(callback: (newState: AlgorithmState) => void) {
        this.stateChangeCallback = callback;
    }

    clearGraphDecoration() {
        if (this.state == "done" || this.state =="init") {
            const vertices = this.decorator.getGraph().getVertexIds();
            const edges = this.decorator.getGraph().getEdgeList();
            for (const vertex of vertices) {
                this.decorator.setVertexState(vertex, "default");
            }
            for (const edge of edges) {
                this.decorator.setEdgeState(edge[0], edge[1], "default");
            }
        }
    }

    getOutputGraph() {
        return this.mst;
    }

    getFullName() {
        return "Prim's Minimum Spanning Tree Algorithm";
    }

    getShortName() {
        return "Prim MST";
    }
}
