import $ from "jquery";

import GraphTabs from "./graphtabs";
import * as Layout from "./layouts";
import GraphDrawing from "./drawing/graphdrawing";
import Graph from "./graph";

export default class GraphGenerate {
    constructor(graphTabs: GraphTabs) {
        $("#graphGenerateForm").on("submit", e => {
            // const kind = $("#selectGraphType").val() as string;
            const n = $("#inputNumVertices").val() as number;
            const tabbar = graphTabs.getTabBar();
            const newId = tabbar.addTabElement(`Complete Graph (K_${n})`, "generated");
            tabbar.setActiveById(newId);
            const layout = new Layout.CircularLayout(graphTabs.getStageDims());
            const graphDrawing = new GraphDrawing(layout, Graph.completeGraph(n));
            graphTabs.updateGraphDrawing(newId, graphDrawing);
            $("#generateModal").modal("hide");
            e.preventDefault();
        });
    }
}
