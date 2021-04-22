import $ from "jquery";

import * as Layout from "./layouts";
import GraphTabs from "./graphtabs";

export default class AutoLayout {
    graphTabs: GraphTabs;

    constructor(graphTabs: GraphTabs) {
        this.graphTabs = graphTabs;
        $("#layout-buttons-container").find("button").on("click", e => {
            const layoutName = $(e.target).closest("[data-layout]")
                .attr("data-layout") as Layout.LayoutName;
            this.setLayout(layoutName);
        });
    }

    setLayout(layoutName: Layout.LayoutName) {
        const drawing = this.graphTabs.getActiveGraphDrawing();
        if (drawing == undefined) {
            return;
        }
        const layout = Layout.getLayoutForStageDims(layoutName,
            this.graphTabs.getStageDims());
        drawing.renderGraph(layout);
    }
}
