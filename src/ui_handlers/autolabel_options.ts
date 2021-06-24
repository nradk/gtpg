import $ from "jquery";

import GraphTabs from "./graphtabs";
import { AutoLabelScheme } from "../drawing/graphdrawing";

export default class AutoLabelOptions {
    graphTabs: GraphTabs;

    constructor(graphTabs: GraphTabs) {
        this.graphTabs = graphTabs;
        const reset = () => $("#vertexLabelRadios").find('input[type=radio]').prop('checked', false);
        this.graphTabs.registerTabSwitchCallback(() => {
            const graphdrawing = this.graphTabs.getActiveGraphDrawing();
            if (graphdrawing == undefined) {
                return;
            }
            const scheme = graphdrawing.getAutoLabelScheme() as string;
            reset();
            $("#vertexLabelRadios").find(`input[value=${scheme}]`).prop('checked', true);
        });
        $("#vertexLabelRadios").find("input[type=radio]").on('click', (e) => {
            const target = e.target as HTMLInputElement;
            // TODO I'm not liking these 'as' casts very much. We're writing
            // very unsafe code this way.
            this.graphTabs.getActiveGraphDrawing()?.setAutoLabelScheme(target.value as AutoLabelScheme);
        });
    }
}
