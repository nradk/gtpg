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

    private readonly algorithm: Algorithm;
    private readonly play_btn: JQuery<HTMLElement>;
    private readonly pause_btn: JQuery<HTMLElement>;
    private readonly stop_btn: JQuery<HTMLElement>;
    private readonly clear_btn: JQuery<HTMLElement>;
    private readonly speed_slider: JQuery<HTMLElement>;
    private readonly output_tab_btn: JQuery<HTMLElement>;
    private readonly output_export_btn: JQuery<HTMLElement>;
    private readonly output_drop_btn: JQuery<HTMLElement>;
    private readonly graphTabs: GraphTabs;
    private readonly graphDrawing: GraphDrawing;

    constructor(graphTabs: GraphTabs, graphDrawing: GraphDrawing) {
        super();
        //const shadow = this.attachShadow({mode: 'open'});
        const template: HTMLTemplateElement =
            document.querySelector("#kruskal-control-template");
        const templateFrag = document.importNode(template.content, true);
        this.appendChild(templateFrag);

        this.graphTabs = graphTabs;
        this.graphDrawing = graphDrawing;
        this.algorithm = new KruskalMST(this.graphDrawing.getDecorator());
        this.algorithm.setStateChangeCallback(this.algorithmStateChanged.bind(this));

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
            this.algorithm.pause();
        });
        this.play_btn.on('click', () => {
            console.log("Play button clicked");
            if (this.graphDrawing.getGraph().getVertexIds().length == 0) {
                alert("Please create a graph with at least one vertex!");
                return;
            }
            if (this.algorithm.getState() == "init" ||
                    this.algorithm.getState() == "done") {
                this.algorithmStateChanged("init"); // TODO this is bad
                this.algorithm.execute();
                console.log("Algorithm executing");
            } else {
                console.log("Algorithm resuming");
                this.algorithm.resume();
            }
        });
        this.stop_btn.on('click', () => {
            this.algorithm.stop();
        });
        this.clear_btn.on('click', () => {
            this.algorithm.clearGraphDecoration();
        });
        this.speed_slider.on('change', () => {
            const value = this.speed_slider.val() as number;
            this.algorithm.setSpeed(Number(value));
        });
        this.output_tab_btn.on('click', () => {
            const graph = this.algorithm.getOutputGraph();
            const graphDrawing = this.getGraphDrawingForOutput(graph);
            Util.createTabWithGraphDrawing(this.graphTabs, graphDrawing,
                "Kruskal MST");
        });
        this.output_export_btn.on('click', () => {
            const graph = this.algorithm.getOutputGraph();
            const graphDrawing = this.getGraphDrawingForOutput(graph);
            ImportExport.exportGraphDrawing(graphDrawing, "Kruskal_MST.json");
        });
        this.algorithmStateChanged("init"); // TODO this is bad
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
}

customElements.define('kruskal-controls', KruskalControls);
