import $ from "jquery";
import { AlgorithmRunner, AlgorithmState, Algorithm, AlgorithmError, AlgorithmOutput } from "../algorithm/algorithm";
import GraphTabs from "../ui_handlers/graphtabs";
import * as Util from "../util";
import ImportExport from "../ui_handlers/importexport";
import * as Layout from "../drawing/layouts";
import { GraphDrawing } from "../drawing/graphdrawing";
import { Graph } from "../graph_core/graph";
import { VertexInput, NoVertexClickedError, SourceSinkInput } from "../commontypes";
import { Decorator } from "../decoration/decorator";
import { showMessage } from "../ui_handlers/notificationservice";

export class AlgorithmControls extends HTMLElement {
}

export abstract class GenericControls extends AlgorithmControls {

    protected readonly play_btn: JQuery<HTMLElement>;
    protected readonly pause_btn: JQuery<HTMLElement>;
    protected readonly stop_btn: JQuery<HTMLElement>;
    protected readonly clear_btn: JQuery<HTMLElement>;
    protected readonly speed_slider: JQuery<HTMLElement>;
    protected readonly output_tab_btn: JQuery<HTMLElement>;
    protected readonly output_export_btn: JQuery<HTMLElement>;
    protected readonly output_drop_btn: JQuery<HTMLElement>;
    protected readonly graphTabs: GraphTabs;
    protected readonly graphDrawing: GraphDrawing;
    protected output: AlgorithmOutput;

    constructor(graphTabs: GraphTabs, graphDrawing: GraphDrawing) {
        super();
        //const shadow = this.attachShadow({mode: 'open'});
        const template: HTMLTemplateElement =
            document.querySelector("#algo-control-template");
        const templateFrag = document.importNode(template.content, true);
        this.appendChild(templateFrag);

        this.graphTabs = graphTabs;
        this.graphDrawing = graphDrawing;

        $(this).addClass('container-fluid');

        this.speed_slider = $(this).find("#algorithm-speed");
        this.pause_btn = $(this).find("#btn-algo-pause");
        this.play_btn = $(this).find("#btn-algo-play");
        this.stop_btn = $(this).find("#btn-algo-stop");
        this.clear_btn = $(this).find("#btn-algo-clear");
        this.output_tab_btn = $(this).find("#btn-algo-output-tab");
        this.output_export_btn = $(this).find("#btn-algo-output-export");
        this.output_drop_btn = $(this).find("#btndrop-algo-output");

        this.pause_btn.on('click', this.onPause.bind(this));
        this.play_btn.on('click', this.onPlay.bind(this));
        this.stop_btn.on('click', this.onStop.bind(this));
        this.clear_btn.on('click', this.onClear.bind(this));
        this.speed_slider.on('change', () => {
            const value = this.speed_slider.val() as number;
            this.getRunner().setSpeed(Number(value));
        });
        type ExportType = "file" | "tab"
        const exportOutput = (how: ExportType) => {
            const graph = this.output.graph;
            if (graph == null) {
                alert("The algorithm did not generate any output!");
                return;
            }
            const graphDrawing = this.getGraphDrawingForOutput(graph);
            if (how == "tab") {
                Util.createTabWithGraphDrawing(this.graphTabs, graphDrawing,
                    this.output.name);
            } else {
                ImportExport.openDialogToExport(graphDrawing, this.output.name);
            }
        };
        this.output_tab_btn.on('click', () => exportOutput('tab'));
        this.output_export_btn.on('click', () => exportOutput('file'));
        this.algorithmStateChanged("init"); // TODO this is bad
    }

    protected abstract executeAlgorithm(): Promise<AlgorithmOutput>;
    protected abstract getRunner(): AlgorithmRunner<any>;

    protected onPlay() {
        if (this.graphDrawing.getGraph().getVertexIds().size == 0) {
            alert("Please create a graph with at least one vertex!");
            return;
        }
        const runner = this.getRunner();
        if (runner.getState() == "init" ||
            runner.getState() == "done") {
            this.algorithmStateChanged("init"); // TODO this is bad
            this.executeAlgorithm().then(output => {
                if (output.message) {
                    showMessage(output.message);
                }
                this.output = output;
                this.changeButtonState(this.output_drop_btn, output.graph != null);
            }).catch(e => {
                if (e instanceof AlgorithmError) {
                    alert(e.message);
                } else if (e instanceof NoVertexClickedError) {
                } else {
                    alert("There was an unexpected problem with the algorithm.");
                    console.error(e);
                }
            });
        } else {
            runner.resume();
        }
    }

    protected onPause() {
        this.getRunner().pause();
    }

    protected onStop() {
        this.getRunner().stop();
    }

    protected onClear() {
        this.getRunner().getAlgorithm().getDecorator().clearAllDecoration();
    }

    protected getGraphDrawingForOutput(graph: Graph): GraphDrawing {
        let layout: Layout.Layout, graphDrawing: GraphDrawing;
        if (this.graphDrawing == undefined) {
            console.warn("Graphdrawing undefined, creating circular layout");
            layout = new Layout.CircularLayout(
                this.graphTabs.getStageDims());
            graphDrawing = GraphDrawing.create(graph);
        } else {
            console.log("Graphdrawing defined, creating fixed layout");
            const positions: Layout.PositionMap = new Map();
            for (const v of graph.getVertexIds()) {
                positions.set(v, this.graphDrawing.getVertexPosition(v));
            }
            layout = new Layout.FixedLayout(positions);
            graphDrawing = GraphDrawing.create(graph);
        }
        graphDrawing.layoutWithoutRender(layout);
        return graphDrawing;
    }

    protected algorithmStateChanged(newState: AlgorithmState) {
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

    protected changeButtonState(button: JQuery<HTMLElement>, enabled: boolean) {
        if (enabled) {
            button.removeClass("disabled");
            button.removeAttr("disabled");
        } else {
            button.addClass("disabled");
            button.attr("disabled", "true");
        }
    }
}

export class InputlessControls extends GenericControls {

    runner: AlgorithmRunner<void>;
    algorithm: Algorithm<void>;

    constructor(AlgorithmClass: new (decorator: Decorator) => Algorithm<void>,
            graphTabs: GraphTabs, graphDrawing: GraphDrawing) {
        super(graphTabs, graphDrawing);
        this.algorithm = new AlgorithmClass(graphDrawing.getDecorator());
        this.runner = new AlgorithmRunner(this.algorithm);
        this.runner.setStateChangeCallback(this.algorithmStateChanged.bind(this));
        $(this).find("#algo-name").text(this.getRunner().getAlgorithm().getFullName());
    }

    async executeAlgorithm(): Promise<AlgorithmOutput> {
        return this.getRunner().execute();
    }

    getRunner(): AlgorithmRunner<void> {
        return this.runner;
    }
}

export class VertexInputControls extends GenericControls {

    private runner: AlgorithmRunner<VertexInput>;
    private algorithm: Algorithm<VertexInput>;

    constructor(AlgorithmClass: new (decorator: Decorator) => Algorithm<VertexInput>,
            graphTabs: GraphTabs, graphDrawing: GraphDrawing) {
        super(graphTabs, graphDrawing);
        this.algorithm = new AlgorithmClass(graphDrawing.getDecorator());
        this.runner = new AlgorithmRunner(this.algorithm);
        this.runner.setStateChangeCallback(this.algorithmStateChanged.bind(this));
        $(this).find("#algo-name").text(this.getRunner().getAlgorithm().getFullName());
    }

    async executeAlgorithm(): Promise<AlgorithmOutput> {
        const title = "Select Vertex";
        const body = "Please click on a vertex to start from";
        return this.graphDrawing.enterVertexSelectMode(title, body).then(s =>
            this.getRunner().execute({ vertexId: s })
        );
    }

    getRunner(): AlgorithmRunner<VertexInput> {
        return this.runner;
    }
}

export class SourceSinkInputControls extends GenericControls {

    private runner: AlgorithmRunner<SourceSinkInput>;
    private algorithm: Algorithm<SourceSinkInput>;

    constructor(AlgorithmClass: new (decorator: Decorator) => Algorithm<SourceSinkInput>,
            graphTabs: GraphTabs, graphDrawing: GraphDrawing) {
        super(graphTabs, graphDrawing);
        this.algorithm = new AlgorithmClass(graphDrawing.getDecorator());
        this.runner = new AlgorithmRunner(this.algorithm);
        this.runner.setStateChangeCallback(this.algorithmStateChanged.bind(this));
        $(this).find("#algo-name").text(this.getRunner().getAlgorithm().getFullName());
    }

    async executeAlgorithm(): Promise<AlgorithmOutput> {
        const source = this.graphDrawing.enterVertexSelectMode("Select Source",
                "Please click on the source vertex.");
        const sink = source.then(_ => {
             return this.graphDrawing.enterVertexSelectMode("Select Sink",
                    "Please click on the sink vertex.");
        });
        return Promise.all([source, sink]).then(([sourceId, sinkId]) => (
            this.getRunner().execute({ sourceId: sourceId, sinkId: sinkId })
        ));
    }

    getRunner(): AlgorithmRunner<SourceSinkInput> {
        return this.runner;
    }
}

customElements.define('inputless-controls', InputlessControls);
customElements.define('vertexinput-controls', VertexInputControls);
customElements.define('sourcesinkinput-controls', SourceSinkInputControls);
