import $ from "jquery";

import GraphTabs from "./graphtabs";

export default class DisplayCustomizer {
    graphTabs: GraphTabs;

    constructor(graphTabs: GraphTabs) {
        this.graphTabs = graphTabs;
        $("#vertex-size").on("change", (e) => {
            const target = e.target as HTMLInputElement;
            this.setVertexSize(parseInt(target.value));
        });
    }

    setVertexSize(vertexSize: number) {
        const drawing = this.graphTabs.getActiveGraphDrawing();
        if (drawing == undefined) {
            return;
        }
        drawing.setVertexRadius(2 + vertexSize);
    }
}
