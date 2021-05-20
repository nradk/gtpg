import Konva from 'konva';
import $ from "jquery";

import { TabBar, TabType } from "../components/tabbar";
import GraphDrawing from "../drawing/graphdrawing";
import { UnweightedGraph } from "../graph_core/graph";
import { Size } from "../commontypes";

export default class GraphTabs {
    tabBar: TabBar = $("tab-bar")[0] as TabBar;
    tabDrawings: {[id: number]: GraphDrawing} = {};
    stage: Konva.Stage;

    constructor(stage: Konva.Stage) {
        this.stage = stage;
        this.tabBar.setTabCreatedCallback((id: number, tabType: TabType) => {
            const directed = tabType == "empty-directed";
            this.tabDrawings[id] = new GraphDrawing(new UnweightedGraph(directed));
        });
        this.tabBar.setTabActivatedCallback((id: number) => {
            this.stage.removeChildren();
            this.stage.clear();
            this.tabDrawings[id].setStage(this.stage);
            this.tabDrawings[id].renderGraph();
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

    getActiveGraphDrawing(): GraphDrawing {
        return this.tabDrawings[this.tabBar.getActiveTabId()];
    }

    getStageDims(): Size {
        return {width: this.stage.width(), height: this.stage.height()};
    }

    getTabBar(): TabBar {
        return this.tabBar;
    }
}
