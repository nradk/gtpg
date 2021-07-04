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

    static readonly algorithms = {
        "#btn-algo-kruskal": [InputlessControls, KruskalMST],
        "#btn-algo-prim": [InputlessControls, PrimMST],
        "#btn-algo-bfs": [VertexInputControls, BreadthFirstSearch],
        "#btn-algo-dfs": [VertexInputControls, DepthFirstSearch],
        "#btn-algo-dijkstra": [VertexInputControls, DijkstrasShortestPath],
        "#btn-algo-fleury": [InputlessControls, FleuryEulerTrail],
        "#btn-algo-articulation": [InputlessControls, ArticulationPoints],
        "#btn-algo-bhk": [InputlessControls, BHKHamiltonPath],
        "#btn-algo-bhk-tsp": [InputlessControls, BHK_TSP],
        "#btn-algo-nn-tsp": [InputlessControls, TSPApproxNearestNeighbor],
        "#btn-algo-ni-tsp": [InputlessControls, TSPApproxNearestInsert],
        "#btn-algo-ci-tsp": [InputlessControls, TSPApproxCheapestInsert],
    };

    constructor(graphTabs: GraphTabs) {
        for (const id in AlgorithmUI.algorithms) {
            $(id).on('click', () => {
                const graphDrawing = graphTabs.getActiveGraphDrawing();
                if (graphDrawing == undefined) {
                    alert("Please create or open a graph first.");
                    return false;
                }
                const Controls = AlgorithmUI.algorithms[id][0];
                const Algorithm = AlgorithmUI.algorithms[id][1];
                const controls = new Controls(Algorithm, graphTabs, graphDrawing);
                graphTabs.setControlPanelForActiveTab(controls);

            });
        }
    }
}
