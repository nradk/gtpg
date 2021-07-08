import $ from "jquery";

import GraphTabs from "./graphtabs";

export default class DisplayCustomizer {
    graphTabs: GraphTabs;

    constructor(graphTabs: GraphTabs) {
        this.graphTabs = graphTabs;
        this.graphTabs.registerTabSwitchCallback(() => {
            const graphDrawing = this.graphTabs.getActiveGraphDrawing();
            if (graphDrawing != null) {
                this.setVertexSizeSliderPosition(graphDrawing.getVertexRadius());
                this.setWeightFontSizeSelectValue(graphDrawing.getWeightFontSize());
            }
        });
        $("#vertex-size").on("change", (e) => {
            const target = e.target as HTMLInputElement;
            this.setVertexSize(parseInt(target.value));
        });
        $("#vertex-size").on("input", () => $("#vertex-size").trigger('change'));
        $("#weight-size").on("change", (e) => {
            const target = e.target as HTMLInputElement;
            const value = parseInt(target.value);
            if (isNaN(value)) {
                console.error(`Could not interpret ${target.value} as a number`);
                return;
            }
            this.setWeightFontSize(value);
        });

    }

    private setVertexSize(vertexSize: number) {
        const drawing = this.graphTabs.getActiveGraphDrawing();
        if (drawing == undefined) {
            return;
        }
        drawing.setVertexRadius(2 + vertexSize);
    }

    private setVertexSizeSliderPosition(vertexSize: number) {
         $("#vertex-size").prop("value", vertexSize - 2);
    }

    private setWeightFontSize(fontSize: number) {
        const drawing = this.graphTabs.getActiveGraphDrawing();
        if (drawing == undefined) {
            return;
        }
        drawing.setWeightFontSize(fontSize);
    }

    private setWeightFontSizeSelectValue(fontSize: number) {
         $("#weight-size").prop("value", fontSize);
    }
}
