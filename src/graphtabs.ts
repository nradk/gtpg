import Konva from 'konva';
import $ from "jquery";

import { TabBar } from "./custom/tabbar";
import { GraphDrawing } from "./drawings";
import * as Layouts from "./layouts";
import Graph from "./graph";
import { Size } from "./commontypes";

export default class GraphTabs {
    tabBar: TabBar = $("tab-bar")[0] as TabBar;
    tabDrawings: {[id: number]: GraphDrawing} = {};
    stage: Konva.Stage;

    constructor(stage: Konva.Stage) {
        this.stage = stage;
        this.tabBar.setTabCreatedCallback((id: number) => {
            const layout: Layouts.Layout = Layouts.getLayoutForStageDims(
                "circular", this.getStageDims());
            this.tabDrawings[id] = new GraphDrawing(layout, new Graph(true));
        });
        this.tabBar.setTabActivatedCallback((id: number) => {
            this.stage.destroyChildren();
            this.stage.clear();
            this.tabDrawings[id].setStage(this.stage);
            this.tabDrawings[id].renderGraph();
        });
        this.tabBar.setTabDeactivatedCallback((id: number) => {
            this.tabDrawings[id].detachStage();
            this.stage.destroyChildren();
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

