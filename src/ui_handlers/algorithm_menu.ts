import $ from "jquery";
import {  InputlessControls, VertexInputControls, SourceSinkInputControls }
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
import { TSPApproxMSTBased } from "../algorithm/tsp/approx_mst";
import { ArticulationPoints } from "../algorithm/decompose/articulation";
import { EdmondsKarpAlgorithm } from "../algorithm/flow/edmonds_karp";
import { TSPApproxChristofides } from "../algorithm/tsp/approx_christofides";

export default class AlgorithmMenu {

    static readonly algorithms = {
        "#btn-algo-kruskal": [InputlessControls, KruskalMST],
        "#btn-algo-prim": [VertexInputControls, PrimMST],
        "#btn-algo-bfs": [VertexInputControls, BreadthFirstSearch],
        "#btn-algo-dfs": [VertexInputControls, DepthFirstSearch],
        "#btn-algo-dijkstra": [VertexInputControls, DijkstrasShortestPath],
        "#btn-algo-fleury": [InputlessControls, FleuryEulerTrail],
        "#btn-algo-articulation": [InputlessControls, ArticulationPoints],
        "#btn-algo-bhk": [InputlessControls, BHKHamiltonPath],
        "#btn-algo-bhk-tsp": [InputlessControls, BHK_TSP],
        "#btn-algo-nn-tsp": [VertexInputControls, TSPApproxNearestNeighbor],
        "#btn-algo-ni-tsp": [VertexInputControls, TSPApproxNearestInsert],
        "#btn-algo-ci-tsp": [VertexInputControls, TSPApproxCheapestInsert],
        "#btn-algo-mst-tsp": [InputlessControls, TSPApproxMSTBased],
        "#btn-algo-mst-c": [InputlessControls, TSPApproxChristofides],
        "#btn-algo-edmondskarp": [SourceSinkInputControls, EdmondsKarpAlgorithm],
    };

    constructor(graphTabs: GraphTabs) {
        for (const id in AlgorithmMenu.algorithms) {
            $(id).on('click', () => {
                const graphDrawing = graphTabs.getActiveGraphDrawing();
                if (graphDrawing == undefined) {
                    alert("Please create or open a graph first.");
                    return false;
                }
                const Controls = AlgorithmMenu.algorithms[id][0];
                const Algorithm = AlgorithmMenu.algorithms[id][1];
                const controls = new Controls(Algorithm, graphTabs, graphDrawing);
                graphTabs.setControlPanelForActiveTab(controls);
            });
        }
    }
}
