import $ from "jquery";
import { KruskalMST } from "../algorithm/kruskal/kruskal";
import { KruskalControls } from "../algorithm/kruskal/kruskal_controls";
import GraphTabs from "./graphtabs";

export default class AlgorithmUI {

    constructor(graphTabs: GraphTabs) {
        $("#btn-algo-kruskal").on('click', () => {
            const graphDrawing = graphTabs.getActiveGraphDrawing();
            if (graphDrawing == undefined) {
                console.error("No graph present for Kruskal Algorithm.");
                alert("Please create or open a graph first to apply Kruskal's" +
                    " Algorithm.");
                return;
            }
            if (graphDrawing.getGraph().getVertexIds().length == 0) {
                alert("Please provide a graph with at least one vertex!");
                return;
            }
            const controls = new KruskalControls();
            $("#algo-control").empty().append(controls);
            const algorithm = new KruskalMST(graphDrawing.getDecorator());
            controls.setAlgorithm(algorithm);
            algorithm.execute();
        });
    }
}
