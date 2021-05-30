import $ from "jquery";
import { KruskalControls } from "../algorithm/kruskal/kruskal_controls";
import GraphTabs from "./graphtabs";

export default class AlgorithmUI {

    constructor(graphTabs: GraphTabs) {
        $("#btn-algo-kruskal").on('click', () => {
            const controls = new KruskalControls(graphTabs);
            $("#algo-control").empty().append(controls);
        });
    }
}
