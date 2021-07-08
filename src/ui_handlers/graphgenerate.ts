import $ from "jquery";

import GraphTabs from "./graphtabs";
import * as Layout from "../drawing/layouts";
import { GraphDrawing } from "../drawing/graphdrawing";
import * as GraphUtil from "../graph_core/graph_util";

export default class GraphGenerate {
    constructor(private graphTabs: GraphTabs) {
        $("div.conditional-show[data-showon=complete-bipartite]").hide();
        $("#selectGraphType").val('complete');
        $("#selectGraphType").on('change', e => {
            const val = (e.target as HTMLInputElement).value;
            $("div.conditional-show").hide();
            $(`div.conditional-show[data-showon=${val}`).show();
        });
        $("#graphGenerateForm").on("submit", e => {
            const kind = $("#selectGraphType").val();
            e.preventDefault();
            if (kind == "complete") {
                this.createCompleteGraph();
            } else {
                this.createCompleteBipartiteGraph()
            }
            $("#generateModal").modal("hide");
        });
    }

    private createCompleteGraph() {
        const n = parseInt($("#inputNumVertices").val() as string);
        const tabbar = this.graphTabs.getTabBar();
        const newId = tabbar.addTabElement(`Complete Graph (K_${n})`, "generated");
        tabbar.setActiveById(newId);
        const layout = new Layout.CircularLayout(this.graphTabs.getStageDims());
        const graphDrawing = GraphDrawing.create(GraphUtil.completeGraph(n, false));
        graphDrawing.layoutWithoutRender(layout);
        this.graphTabs.updateGraphDrawing(newId, graphDrawing);

    }

    private createCompleteBipartiteGraph() {
        const m = parseInt($("#inputLeftVertices").val() as string);
        const n = parseInt($("#inputRightVertices").val() as string);
        const tabbar = this.graphTabs.getTabBar();
        const newId = tabbar.addTabElement(`K_${m},${n}`, "generated");
        tabbar.setActiveById(newId);
        const layout = new Layout.BipartiteLayout(this.graphTabs.getStageDims());
        const graphDrawing = GraphDrawing.create(GraphUtil.completeBipartiteGraph(m, n, false, false));
        graphDrawing.layoutWithoutRender(layout);
        this.graphTabs.updateGraphDrawing(newId, graphDrawing);
    }
}
