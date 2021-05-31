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
    mst: WeightedGraph;

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
        this.mst = new WeightedGraph(false)
        for (const v of graph.getVertexIds()) {
            this.mst.addVertex(v);
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
        // Keep track of how many edges have been added to the MST,
        // so we know when we are done.
        let edgesAdded = 0;
        this.step = () => {
            const e = edges.pop();
            // Check if e connects two vertices in different forests
            if (forests[e[0]] != forests[e[1]]) {
                // Add e to MST
                this.mst.addEdge(e[0], e[1], e[2]);
                edgesAdded += 1;
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
            // |E| = |V| - 1 in a tree
            if (edgesAdded == graph.getVertexIds().length - 1) {
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
}
