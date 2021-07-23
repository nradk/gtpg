import Konva from 'konva';
import $ from "jquery";

import { TabBar, TabType } from "../components/tabbar";
import { GraphDrawing, EuclideanGraphDrawing } from "../drawing/graphdrawing";
import { Graph, UnweightedGraph, WeightedGraph } from "../graph_core/graph";
import { EuclideanGraph } from "../graph_core/euclidean_graph";
import { Size } from "../commontypes";
import { AlgorithmControls } from "../components/algorithm_controls";
import { Tools } from "./tools";

export default class GraphTabs {
    tabBar: TabBar = $("tab-bar")[0] as TabBar;
    tabDrawings: {[id: number]: GraphDrawing} = {};
    controlPanels: {[id: number]: AlgorithmControls } = {};
    tabSwitchCallbacks: (() => void)[];
    tools: Tools;
    private clickToAddUpdater: () => void;

    constructor(private stage: Konva.Stage) {
        this.tabSwitchCallbacks = [];
        $("#clickToAddText").hide();
        this.clickToAddUpdater = () => {
            const graph = this.getActiveGraphDrawing()?.getGraph();
            const tool = this.tools.getCurrentTool();
            if (graph == undefined) {
                return;
            }
            if (graph.getVertexIds().size > 0 ||  tool != "default") {
                $("#clickToAddText").hide();
            } else {
                $("#clickToAddText").show();
            }
        };
        this.tools = new Tools(this, this.clickToAddUpdater);
        this.tabBar.setTabCreatedCallback((id: number, tabType: TabType) => {
            let graph: Graph;
            switch (tabType) {
                case "empty-directed":
                    graph = new UnweightedGraph(true);
                    break;
                case "empty-undirected":
                    graph = new UnweightedGraph(false);
                    break;
                case "empty-directed-weighted":
                    graph = new WeightedGraph(true);
                    break;
                case "empty-undirected-weighted":
                    graph = new WeightedGraph(false);
                    break;
                case "empty-euclidean":
                    graph = new EuclideanGraph();
                    break;
                default:
                    graph = new UnweightedGraph(true);
            }
            if (graph instanceof EuclideanGraph) {
                this.tabDrawings[id] = new EuclideanGraphDrawing(graph);
            } else {
                this.tabDrawings[id] = GraphDrawing.create(graph);
            }
            if (Object.keys(this.tabDrawings).length == 1) {
                $("#noGraphText").hide();
            }
        });
        this.tabBar.setTabActivatedCallback((id: number) => {
            this.stage.removeChildren();
            this.stage.clear();
            this.tabDrawings[id].attachStage(this.stage, this.tools);
            this.tabDrawings[id].renderGraph();
            this.setCorrectControlPanel();
            this.tabSwitchCallbacks.forEach(cb => cb());
            this.clickToAddUpdater();
            this.tabDrawings[id].setGraphEditCallback(this.clickToAddUpdater);
        });
        this.tabBar.setTabDeactivatedCallback((id: number) => {
            this.tabDrawings[id].detachStage();
            $("#clickToAddText").hide();
            this.tabDrawings[id].setGraphEditCallback(undefined);
            this.controlPanels[id]?.onDetach();
            this.stage.removeChildren();
            this.stage.clear();
        });
        this.tabBar.setTabClosedCallback((id: number) => {
            delete this.tabDrawings[id];
            $(this.controlPanels[id]).remove();
            delete this.controlPanels[id];
            if (Object.keys(this.tabDrawings).length == 0) {
                $("#noGraphText").show();
            }
        });
    }

    updateGraphDrawing(id: number, graphDrawing: GraphDrawing) {
        const active = this.tabBar.getActiveTabId();
        if (active == id) {
            this.tabDrawings[id].detachStage();
            this.stage.destroyChildren();
            this.stage.clear();
            this.tabDrawings[id] = graphDrawing;
            this.tabDrawings[id].attachStage(this.stage, this.tools);
            this.tabDrawings[id].renderGraph();
            this.clickToAddUpdater();
        } else {
            this.tabDrawings[id] = graphDrawing;
        }
    }

    setControlPanelForActiveTab(controlPanel: AlgorithmControls) {
        // TODO properly dispose pre-existing panel
        this.controlPanels[this.tabBar.getActiveTabId()] = controlPanel;
        this.setCorrectControlPanel();
    }

    private setCorrectControlPanel() {
        const controls = this.controlPanels[this.tabBar.getActiveTabId()]
        const container = document.querySelector("#algo-control");
        // We do NOT use Jquery remove() here because it gets rid of all the
        // event handlers as well.
        container.innerHTML = '';
        if (controls) {
            container.appendChild(controls);
            controls.onAttach();
        }
    }

    getActiveGraphDrawing(): GraphDrawing {
        return this.tabDrawings[this.tabBar.getActiveTabId()];
    }

    getStageDims(): Size {
        return {width: this.stage.width(), height: this.stage.height()};
    }

    getTabBar(): TabBar {
        return this.tabBar;
    }

    registerTabSwitchCallback(callback: () => void) {
        this.tabSwitchCallbacks.push(callback);
    }

    getTools() {
        return this.tools;
    }

    getStage() {
        return this.stage;
    }
}
