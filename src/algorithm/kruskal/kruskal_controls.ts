import $ from "jquery";

import { AlgorithmControls } from "../../components/algorithm_controls";
import { Algorithm, AlgorithmState } from "../../algorithm/algorithm";
import { KruskalMST } from "./kruskal";
import GraphTabs from "../../ui_handlers/graphtabs";
import * as Util from "../../util";
import ImportExport from "../../ui_handlers/importexport";
import * as Layout from "../../drawing/layouts";
import GraphDrawing from "../../drawing/graphdrawing";
import { Graph } from "../../graph_core/graph";

export class KruskalControls extends AlgorithmControls {

    private algorithm: Algorithm;
    private play_btn: JQuery<HTMLElement>;
    private pause_btn: JQuery<HTMLElement>;
    private stop_btn: JQuery<HTMLElement>;
    private clear_btn: JQuery<HTMLElement>;
    private speed_slider: JQuery<HTMLElement>;
    private output_tab_btn: JQuery<HTMLElement>;
    private output_export_btn: JQuery<HTMLElement>;
    private output_drop_btn: JQuery<HTMLElement>;
    private graphTabs: GraphTabs;
    private graphDrawing: GraphDrawing;

    constructor(graphTabs: GraphTabs) {
        super();
        //const shadow = this.attachShadow({mode: 'open'});
        const template: HTMLTemplateElement =
            document.querySelector("#kruskal-control-template");
        const templateFrag = document.importNode(template.content, true);
        this.appendChild(templateFrag);

        this.graphTabs = graphTabs;
        this.graphTabs.registerTabSwitchCallback(this.onGraphTabSwitch.bind(this));

        $(this).addClass('container-fluid');
        this.speed_slider = $(this).find("#algorithm-speed");
        this.pause_btn = $(this).find("#btn-kruskal-pause");
        this.play_btn = $(this).find("#btn-kruskal-play");
        this.stop_btn = $(this).find("#btn-kruskal-stop");
        this.clear_btn = $(this).find("#btn-kruskal-clear");
        this.output_tab_btn = $(this).find("#btn-kruskal-output-tab");
        this.output_export_btn = $(this).find("#btn-kruskal-output-export");
        this.output_drop_btn = $(this).find("#btndrop-kruskal-output");
        this.pause_btn.on('click', () => {
            this.algorithm?.pause();
        });
        this.play_btn.on('click', () => {
            if (this.algorithm == undefined) {
                const success = this.initAlgorithm();
                if (!success) {
                    return;
                }
            }
            if (this.algorithm.getState() == "init" ||
                    this.algorithm.getState() == "done") {
                this.algorithm.execute();
            } else {
                this.algorithm.resume();
            }
        });
        this.stop_btn.on('click', () => {
            this.algorithm?.stop();
        });
        this.clear_btn.on('click', () => {
            this.algorithm?.clearGraphDecoration();
        });
        this.speed_slider.on('change', () => {
            const value = this.speed_slider.val() as number;
            this.algorithm?.setSpeed(Number(value));
        });
        this.output_tab_btn.on('click', () => {
            const graph = this.algorithm?.getOutputGraph();
            const graphDrawing = this.getGraphDrawingForOutput(graph);
            Util.createTabWithGraphDrawing(this.graphTabs, graphDrawing,
                "Kruskal MST");
        });
        this.output_export_btn.on('click', () => {
            const graph = this.algorithm?.getOutputGraph();
            const graphDrawing = this.getGraphDrawingForOutput(graph);
            ImportExport.exportGraphDrawing(graphDrawing, "Kruskal_MST.json");
        });

        this.initialize();
    }

    private getGraphDrawingForOutput(graph: Graph): GraphDrawing {
        let layout: Layout.Layout, graphDrawing: GraphDrawing;
        if (this.graphDrawing == undefined) {
            console.warn("Graphdrawing undefined, creating circular layout");
            layout = new Layout.CircularLayout(
                this.graphTabs.getStageDims());
            graphDrawing = new GraphDrawing(graph);
        } else {
            console.log("Graphdrawing defined, creating fixed layout");
            layout = new Layout.FixedLayout(
                this.graphDrawing.getVertexPositions());
            graphDrawing = new GraphDrawing(graph);
        }
        graphDrawing.layoutWithoutRender(layout);
        return graphDrawing;
    }

    private initialize() {
        this.algorithm = undefined;
        this.algorithmStateChanged("init");
    }

    private initAlgorithm(): boolean {
        this.graphDrawing = this.graphTabs.getActiveGraphDrawing();
        if (this.graphDrawing == undefined) {
            console.error("No graph present for Kruskal Algorithm.");
            alert("Please create or open a graph first to apply Kruskal's" +
                " Algorithm.");
            return false;
        }
        if (this.graphDrawing.getGraph().getVertexIds().length == 0) {
            alert("Please provide a graph with at least one vertex!");
            return false;
        }
        this.setAlgorithm(new KruskalMST(this.graphDrawing.getDecorator()));
        return true;
    }

    private setAlgorithm(algorithm: Algorithm) {
        algorithm.setStateChangeCallback(this.algorithmStateChanged.bind(this));
        this.algorithm = algorithm;
    }

    private algorithmStateChanged(newState: AlgorithmState) {
        switch (newState) {
            case "init":
                this.changeButtonState(this.play_btn, true);
                this.changeButtonState(this.pause_btn, false);
                this.changeButtonState(this.stop_btn, false);
                this.changeButtonState(this.clear_btn, true);
                this.changeButtonState(this.output_drop_btn, false);
                break;
            case "paused":
                this.changeButtonState(this.play_btn, true);
                this.changeButtonState(this.pause_btn, false);
                this.changeButtonState(this.stop_btn, true);
                this.changeButtonState(this.clear_btn, false);
                this.changeButtonState(this.output_drop_btn, false);
                break;
            case "running":
                this.changeButtonState(this.play_btn, false);
                this.changeButtonState(this.pause_btn, true);
                this.changeButtonState(this.stop_btn, true);
                this.changeButtonState(this.clear_btn, false);
                this.changeButtonState(this.output_drop_btn, false);
                break;
            case "done":
                this.changeButtonState(this.play_btn, true);
                this.changeButtonState(this.pause_btn, false);
                this.changeButtonState(this.stop_btn, false);
                this.changeButtonState(this.clear_btn, true);
                this.changeButtonState(this.output_drop_btn, true);
                break;
        }
    }

    private changeButtonState(button: JQuery<HTMLElement>, enabled: boolean) {
        if (enabled) {
            button.removeClass("disabled");
            button.removeAttr("disabled");
        } else {
            button.addClass("disabled");
            button.attr("disabled", "true");
        }
    }

    private onGraphTabSwitch() {
        this.initialize();
    }
}

customElements.define('kruskal-controls', KruskalControls);
