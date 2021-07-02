import $ from "jquery";
import {  InputlessControls, VertexInputControls }
    from "../components/algorithm_controls";
import GraphTabs from "./graphtabs";
import { KruskalMST } from "../algorithm/mst/kruskal";
import { PrimMST } from "../algorithm/mst/prim";
import { BreadthFirstSearch } from "../algorithm/search/bfs";
import { DepthFirstSearch } from "../algorithm/search/dfs";
import { DijkstrasShortestPath } from "../algorithm/shortestpath/dijkstra";
import { FleuryEulerTrail } from "../algorithm/walks/euler";
import { BHKHamiltonPath } from "../algorithm/walks/hamilton";
import { BHK_TSP } from "../algorithm/tsp/bhk";
import { TSPApproxNearestNeighbor } from "../algorithm/tsp/approx_nearest_neighbor";
import { TSPApproxNearestInsert } from "../algorithm/tsp/approx_nearest_insert";
import { TSPApproxCheapestInsert } from "../algorithm/tsp/approx_cheapest_insert";
import { ArticulationPoints } from "../algorithm/decompose/articulation";

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

        $("#btn-algo-dijkstra").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for Dijkstra's Algorithm.");
                alert("Please create or open a graph first to apply Dijkstra's" +
                    " Algorithm.");
                return false;
            }
            const controls = new VertexInputControls(DijkstrasShortestPath,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });

        $("#btn-algo-fleury").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for Fleury's Algorithm.");
                alert("Please create or open a graph first to apply Fleury's" +
                    " Algorithm.");
                return false;
            }
            const controls = new InputlessControls(FleuryEulerTrail,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });

        $("#btn-algo-articulation").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for Articulation Points Algorithm.");
                alert("Please create or open a graph first to apply Articulation Points" +
                    " Algorithm.");
                return false;
            }
            const controls = new InputlessControls(ArticulationPoints,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });

        $("#btn-algo-bhk").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for Bellman-Held-Karp algorithm.");
                alert("Please create or open a graph first to apply Bellman-Held-Karp" +
                    " Algorithm.");
                return false;
            }
            const controls = new InputlessControls(BHKHamiltonPath,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });

        $("#btn-algo-bhk-tsp").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for Bellman-Held-Karp TSP algorithm.");
                alert("Please create or open a graph first to apply Bellman-Held-Karp TSP" +
                    " Algorithm.");
                return false;
            }
            const controls = new InputlessControls(BHK_TSP,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });

        $("#btn-algo-nn-tsp").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for Nearest Neighbor TSP approximation algorithm.");
                alert("Please create or open a graph first to apply Nearest Neighbor TSP" +
                    " Approximation Algorithm.");
                return false;
            }
            const controls = new InputlessControls(TSPApproxNearestNeighbor,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });

        $("#btn-algo-ni-tsp").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for Nearest Insert TSP approximation algorithm.");
                alert("Please create or open a graph first to apply Nearest Insert TSP" +
                    " Approximation Algorithm.");
                return false;
            }
            const controls = new InputlessControls(TSPApproxNearestInsert,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });

        $("#btn-algo-ci-tsp").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for Cheapest Insert TSP approximation algorithm.");
                alert("Please create or open a graph first to apply Cheapest Insert TSP" +
                    " Approximation Algorithm.");
                return false;
            }
            const controls = new InputlessControls(TSPApproxCheapestInsert,
                graphTabs, graphDrawing);
            graphTabs.setControlPanelForActiveTab(controls);
        });
    }
}
