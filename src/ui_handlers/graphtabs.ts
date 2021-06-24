import Konva from 'konva';
import $ from "jquery";

import { TabBar, TabType } from "../components/tabbar";
import GraphDrawing from "../drawing/graphdrawing";
import { Graph, UnweightedGraph, WeightedGraph } from "../graph_core/graph";
import { Size } from "../commontypes";
import { AlgorithmControls } from "../components/algorithm_controls";

export default class GraphTabs {
    tabBar: TabBar = $("tab-bar")[0] as TabBar;
    tabDrawings: {[id: number]: GraphDrawing} = {};
    controlPanels: {[id: number]: HTMLElement} = {};
    stage: Konva.Stage;
    tabSwitchCallbacks: (() => void)[];

    constructor(stage: Konva.Stage) {
        this.stage = stage;
        this.tabSwitchCallbacks = [];
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
                default:
                    graph = new UnweightedGraph(true);
            }
            this.tabDrawings[id] = new GraphDrawing(graph);
        });
        this.tabBar.setTabActivatedCallback((id: number) => {
            this.stage.removeChildren();
            this.stage.clear();
            this.tabDrawings[id].setStage(this.stage);
            this.tabDrawings[id].renderGraph();
            this.setCorrectControlPanel();
            this.tabSwitchCallbacks.forEach(cb => cb());
        });
        this.tabBar.setTabDeactivatedCallback((id: number) => {
            this.tabDrawings[id].detachStage();
            this.stage.removeChildren();
            this.stage.clear();
        });
        this.tabBar.setTabClosedCallback((id: number) => {
            delete this.tabDrawings[id];
        });
    }

    updateGraphDrawing(id: number, graphDrawing: GraphDrawing) {
        const active = this.tabBar.getActiveTabId();
        if (active == id) {
            this.tabDrawings[id].detachStage();
            this.stage.destroyChildren();
            this.stage.clear();
            this.tabDrawings[id] = graphDrawing;
            this.tabDrawings[id].setStage(this.stage);
            this.tabDrawings[id].renderGraph();
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
}
