import $ from "jquery";
import {  AlgorithmControls, InputlessControls, VertexInputControls,
    SourceSinkInputControls } from "../components/algorithm_controls";
import { Algorithm } from "../algorithm/algorithm";
import GraphTabs from "./graphtabs";
import { Decorator } from "../decoration/decorator";
import { GraphDrawing } from "../drawing/graphdrawing";
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
import { CountComponents } from "../algorithm/demo/components";


type AlgorithmType<I> = new (d: Decorator) => Algorithm<I>;
type ControlsType<I> = new (algClass: AlgorithmType<I>,
    graphTabs: GraphTabs, graphDrawing: GraphDrawing) => AlgorithmControls;

interface MenuEntry<I> {
    controlsClass: ControlsType<I>;
    algorithmClass: AlgorithmType<I>;
    menuText: string;
}

export default class AlgorithmMenu {

    static readonly algorithms: MenuEntry<any>[][] = [
        [
            {
                controlsClass: InputlessControls,
                algorithmClass: KruskalMST,
                menuText: "Kruskal's Minimum Spanning Tree",
            },
            {
                controlsClass: VertexInputControls,
                algorithmClass: PrimMST,
                menuText: "Prim's Minimum Spanning Tree",
            },
        ],
        [
            {
                controlsClass: VertexInputControls,
                algorithmClass: BreadthFirstSearch,
                menuText: "Breadth First Search",
            },
            {
                controlsClass: VertexInputControls,
                algorithmClass: DepthFirstSearch,
                menuText: "Depth First Search",
            },
        ],
        [
            {
                controlsClass: VertexInputControls,
                algorithmClass: DijkstrasShortestPath,
                menuText: "Dijkstra's Shortest Path",
            },
        ],
        [
            {
                controlsClass: InputlessControls,
                algorithmClass: FleuryEulerTrail,
                menuText: "Fleury's Euler Trail",
            },
            {
                controlsClass: InputlessControls,
                algorithmClass: BHKHamiltonPath,
                menuText: "Bellman-Held-Karp Hamilton Path",
            },
        ],
        [
            {
                controlsClass: InputlessControls,
                algorithmClass: ArticulationPoints,
                menuText: "Articulation Points",
            },
        ],
        [
            {
                controlsClass: InputlessControls,
                algorithmClass: BHK_TSP,
                menuText: "Bellman-Held-Karp TSP",
            },
            {
                controlsClass: VertexInputControls,
                algorithmClass: TSPApproxNearestNeighbor,
                menuText: "Nearest Neighbor TSP (Approximation)",
            },
            {
                controlsClass: VertexInputControls,
                algorithmClass: TSPApproxNearestInsert,
                menuText: "Nearest Insert TSP (Approximation)",
            },
            {
                controlsClass: VertexInputControls,
                algorithmClass: TSPApproxCheapestInsert,
                menuText: "Cheapest Insert TSP (Approximation)",
            },
            {
                controlsClass: InputlessControls,
                algorithmClass: TSPApproxMSTBased,
                menuText: "MST-Based TSP (Approximation)",
            },
            {
                controlsClass: InputlessControls,
                algorithmClass: TSPApproxChristofides,
                menuText: "Christofides TSP (Approximation)",
            },
        ],
        [
            {
                controlsClass: SourceSinkInputControls,
                algorithmClass: EdmondsKarpAlgorithm,
                menuText: "Edmonds-Karp Network Flow",
            },
        ],
        [
            {
                controlsClass: InputlessControls,
                algorithmClass: CountComponents,
                menuText: "Component Count",
            },

        ]
    ];

    constructor(graphTabs: GraphTabs) {
        $("#algorithmDropdown").children().remove();
        for (const category of AlgorithmMenu.algorithms) {
            for (const entry of category) {
                var $a = $("<a>", {"class": "dropdown-item", "href": "#"});
                $a.html(entry.menuText);
                $a.on('click', () => {
                    const graphDrawing = graphTabs.getActiveGraphDrawing();
                    if (graphDrawing == undefined) {
                        alert("Please create or open a graph first.");
                        return false;
                    }
                    const Controls = entry.controlsClass;
                    const Algorithm = entry.algorithmClass;
                    const controls = new Controls(Algorithm, graphTabs,
                        graphDrawing);
                    graphTabs.setControlPanelForActiveTab(controls);
                });
                $("#algorithmDropdown").append($a);
            }
            if (category !== AlgorithmMenu.algorithms[
                AlgorithmMenu.algorithms.length - 1]) {
            $("#algorithmDropdown").append($('<div>',
                {"class": "dropdown-divider"}));
            }

        }
    }
}
