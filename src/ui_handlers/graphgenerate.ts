import $ from "jquery";

import GraphTabs from "./graphtabs";
import * as Layout from "../drawing/layouts";
import GraphDrawing from "../drawing/graphdrawing";
import { UnweightedGraph } from "../graph_core/graph";

export default class GraphGenerate {
    constructor(graphTabs: GraphTabs) {
        $("#graphGenerateForm").on("submit", e => {
            // const kind = $("#selectGraphType").val() as string;
            const n = $("#inputNumVertices").val() as number;
            const tabbar = graphTabs.getTabBar();
            const newId = tabbar.addTabElement(`Complete Graph (K_${n})`, "generated");
            tabbar.setActiveById(newId);
            const layout = new Layout.CircularLayout(graphTabs.getStageDims());
            const graphDrawing = new GraphDrawing(UnweightedGraph.completeGraph(n));
            graphDrawing.layoutWithoutRender(layout);
            graphTabs.updateGraphDrawing(newId, graphDrawing);
            $("#generateModal").modal("hide");
            e.preventDefault();
        });
    }
}
