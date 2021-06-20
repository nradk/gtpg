import Konva from 'konva';
import $ from "jquery";

import 'bootstrap';
import 'bootswatch/dist/lumen/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import GraphTabs from "./ui_handlers/graphtabs";
import AutoLayout from "./ui_handlers/autolayout";
import ImportExport from "./ui_handlers/importexport";
import GraphGenerate from './ui_handlers/graphgenerate';
import DisplayCustomizer from './ui_handlers/display_customizer';
import AlgorithmUI from './ui_handlers/algorithm_menu';
import { WeightedGraph } from './graph_core/graph';
import * as Layout from './drawing/layouts';
import GraphDrawing from './drawing/graphdrawing';

// Double-imports seemingly necessary
import './components/tabbar';   // Executes the module, to register custom element
import * as TabBar from './components/tabbar';  // Actually does the import
import './components/algorithm_controls';

function displayNewGraph(tabType: TabBar.TabType) {
    const tabbar: TabBar.TabBar = document.querySelector("tab-bar");
    const newId = tabbar.addTabElement("New Graph", tabType);
    tabbar.setActiveById(newId);
}

const stage = new Konva.Stage({
    container: 'container',
    width: 1400,
    height: 700,
    draggable: true
});

$("#new-und-wtd-graph-btn").on("click", () => {
    displayNewGraph("empty-undirected-weighted");
});
$("#new-dir-wtd-graph-btn").on("click", () => {
    displayNewGraph("empty-directed-weighted");
});
$("#new-undirected-graph-btn").on("click", () => {
    displayNewGraph("empty-undirected");
});
$("#new-directed-graph-btn").on("click", () => {
    displayNewGraph("empty-directed");
});

$("#new-test-wtd-graph-btn").on("click", () => {
    const tabbar = graphTabs.getTabBar();
    const newId = tabbar.addTabElement('Test Weighted Graph', "generated");
    tabbar.setActiveById(newId);
    const layout = new Layout.CircularLayout(graphTabs.getStageDims());
    const w1 = { weight: 1 };
    const w2 = { weight: 2 };
    const adjacency = {
        1: { 2: w1, 3: w1},
        2: { 1: w1, 3: w2},
        3: { 1: w1, 2: w2},
    };
    const graph = new WeightedGraph(false, adjacency);
    const graphDrawing = new GraphDrawing(graph);
    graphDrawing.layoutWithoutRender(layout);
    graphTabs.updateGraphDrawing(newId, graphDrawing);
});


const graphTabs = new GraphTabs(stage);
new AutoLayout(graphTabs);
new GraphGenerate(graphTabs);
new ImportExport(graphTabs);
new DisplayCustomizer(graphTabs);
new AlgorithmUI(graphTabs);
