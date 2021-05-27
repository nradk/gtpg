import { Algorithm, AlgorithmState } from "../algorithm";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph } from "../../graph_core/graph";

export class KruskalMST implements Algorithm {

    step: () => void;
    timer: ReturnType<typeof setTimeout>;
    state: AlgorithmState;
    stateChangeCallback: (newState: AlgorithmState) => void;
    delay: number;
    decorator: Decorator;

    constructor(decorator: Decorator) {
        this.state = "init";
        this.delay = 400;
        this.decorator = decorator;
    }

    execute() {
        const g = this.decorator.getGraph();
        if (!(g instanceof WeightedGraph) || g.isDirected()) {
            console.warn("Kruskal: weighted undirected graph required!");
            alert("Kruskal's algorithm needs a weighted undirected graph!");
            return;
        }
        this.setState("running");
        const graph = g as WeightedGraph;
        const mst = new WeightedGraph(false)
        for (const v of graph.getVertexIds()) {
            mst.addVertex(v);
        }
        const edges = graph.getEdgeList();
        edges.sort((first, second) => second[2] - first[2]);
        // Disable all edges
        for (const e of edges) {
            this.decorator.setEdgeState(e[0], e[1], "disabled");
        }
        // Create a disjoint-set data structure for the forests
        const forests: {[vertex: number]: number} = {};
        const vertices = graph.getVertexIds();
        for (let i = 0; i < vertices.length; i++) {
            forests[vertices[i]] = i;
        }
        this.step = () => {
            const e = edges.pop();
            // Check if e connects two vertices in different forests
            if (forests[e[0]] != forests[e[1]]) {
                // Add e to MST
                mst.addEdge(e[0], e[1], e[2]);
                // Select that edge
                this.decorator.setEdgeState(e[0], e[1], "selected");
                // Merge the forests
                const fa = forests[e[0]];
                const fb = forests[e[1]];
                for (const k of Object.keys(forests)) {
                    if (forests[k] == fb) {
                        forests[k] = fa;
                    }
                }
            }
            if (edges.length == 0) {
                clearTimeout(this.timer);
                this.setState( "stopped");
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
        this.setState("stopped");
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
}
