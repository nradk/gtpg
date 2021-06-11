import $ from "jquery";
import {  InputlessControls, VertexInputControls }
    from "../components/algorithm_controls";
import GraphTabs from "./graphtabs";
import { WeightedGraph } from "../graph_core/graph";
import { KruskalMST } from "../algorithm/mst/kruskal";
import { PrimMST } from "../algorithm/mst/prim";
import { BreadthFirstSearch } from "../algorithm/search/bfs";
import { DepthFirstSearch } from "../algorithm/search/dfs";

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
            const controls = new InputlessControls(KruskalMST,
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
                alert("Prim's algorithm needs a weighted undirected graph!");
                return;
            }
            const controls = new InputlessControls(PrimMST,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });

        $("#btn-algo-bfs").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for BFS.");
                alert("Please create or open a graph first to apply BFS" +
                    " Algorithm.");
                return false;
            }
            const controls = new VertexInputControls(BreadthFirstSearch,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });

        $("#btn-algo-dfs").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for DFS.");
                alert("Please create or open a graph first to apply DFS" +
                    " Algorithm.");
                return false;
            }
            const controls = new VertexInputControls(DepthFirstSearch,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });
    }
}
