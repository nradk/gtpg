import $ from "jquery";

import GraphTabs from "./graphtabs";

export default class DisplayCustomizer {
    graphTabs: GraphTabs;

    constructor(graphTabs: GraphTabs) {
        this.graphTabs = graphTabs;
        this.graphTabs.registerTabSwitchCallback(() => {
            const graphDrawing = this.graphTabs.getActiveGraphDrawing();
            if (graphDrawing != null) {
                this.setSliderPosition(graphDrawing.getVertexRadius());
            }
        });
        $("#vertex-size").on("change", (e) => {
            const target = e.target as HTMLInputElement;
            this.setVertexSize(parseInt(target.value));
        });
        $("#vertex-size").on("input", () => $("#vertex-size").trigger('change'));
    }

    setVertexSize(vertexSize: number) {
        const drawing = this.graphTabs.getActiveGraphDrawing();
        if (drawing == undefined) {
            return;
        }
        drawing.setVertexRadius(2 + vertexSize);
    }

    private setSliderPosition(vertexSize: number) {
         $("#vertex-size").prop("value", vertexSize - 2);
    }
}
