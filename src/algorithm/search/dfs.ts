import { VertexInputAlgorithm, AlgorithmState } from "../algorithm";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph, UnweightedGraph } from "../../graph_core/graph";

export class DepthFirstSearch extends VertexInputAlgorithm {

    step: () => void;
    timer: ReturnType<typeof setTimeout>;
    state: AlgorithmState;
    stateChangeCallback: (newState: AlgorithmState) => void;
    delay: number;
    decorator: Decorator;
    searchTree: WeightedGraph | UnweightedGraph;;

    constructor(decorator: Decorator) {
        super(decorator);
        this.state = "init";
        this.delay = 400;
    }

    executeOnVertex(startVertex: number) {
        const graph = this.decorator.getGraph();
        this.setState("running");
        if (graph instanceof WeightedGraph) {
            this.searchTree = new WeightedGraph(true);
        } else {
            this.searchTree = new UnweightedGraph(true);
        }
        const vertexIds = graph.getVertexIds();
        const inTree: Set<number> = new Set();
        const stack = [startVertex];
        inTree.add(startVertex);
        this.searchTree.addVertex(startVertex);

        for (const v of vertexIds) {
            if (v == startVertex) {
                // Select the initial vertex
                this.decorator.setVertexState(v, "selected");
            } else {
                // Disable all other vertices
                this.decorator.setVertexState(v, "disabled");
            }
        }

        // Disable all edges
        for (const edge of graph.getEdgeList()) {
            this.decorator.setEdgeState(edge[0], edge[1], "disabled");
        }

        this.step = () => {
            const v = stack.pop();

            for (const n of graph.getVertexNeighborIds(v)) {
                if (inTree.has(n)) {
                    continue;
                }
                this.searchTree.addVertex(n);
                if (this.searchTree instanceof WeightedGraph) {
                    const g = graph as WeightedGraph;
                    this.searchTree.addEdge(v, n, g.getEdgeWeight(v, n));
                } else {
                    this.searchTree.addEdge(v, n);
                }
                inTree.add(n);

                this.decorator.setVertexState(n, "selected");
                this.decorator.setEdgeState(v, n, "selected");

                stack.push(n);
            }


            if (stack.length == 0) {
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
        return this.searchTree;
    }

    getFullName() {
        return "Depth First Search Algorithm";
    }

    getShortName() {
        return "DFS";
    }
}
