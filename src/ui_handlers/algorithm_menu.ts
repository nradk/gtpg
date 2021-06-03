import $ from "jquery";
import { AlgorithmControls } from "../components/algorithm_controls";
import GraphTabs from "./graphtabs";
import { WeightedGraph } from "../graph_core/graph";
import { KruskalMST } from "../algorithm/kruskal/kruskal";
import { PrimMST } from "../algorithm/prim/prim";

export default class AlgorithmUI {

    constructor(graphTabs: GraphTabs) {

        $("#btn-algo-kruskal").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for Kruskal Algorithm.");
                alert("Please create or open a graph first to apply Kruskal's" +
                    " Algorithm.");
                return false;
            }
            const g = graphDrawing.getGraph();
            if (!(g instanceof WeightedGraph) || g.isDirected()) {
                alert("Kruskal's algorithm needs a weighted undirected graph!");
                return;
            }
            const controls = new AlgorithmControls(KruskalMST,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });

        $("#btn-algo-prim").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for Prim's Algorithm.");
                alert("Please create or open a graph first to apply Prim's" +
                    " Algorithm.");
                return false;
            }
            const g = graphDrawing.getGraph();
            if (!(g instanceof WeightedGraph) || g.isDirected()) {
                alert("Kruskal's algorithm needs a weighted undirected graph!");
                return;
            }
            const controls = new AlgorithmControls(PrimMST,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });
    }
}
