import Konva from 'konva';
import $ from "jquery";

import 'bootstrap';
import 'bootswatch/dist/lumen/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './img/x-lg.svg';

import GraphTabs from "./ui_handlers/graphtabs";
import AutoLabelOptions from "./ui_handlers/autolabel_options";
import AutoLayout from "./ui_handlers/autolayout";
import ImportExport from "./ui_handlers/importexport";
import GraphGenerate from './ui_handlers/graphgenerate';
import DisplayCustomizer from './ui_handlers/display_customizer';
import AlgorithmUI from './ui_handlers/algorithm_menu';
import BookmarkedGraphs from './ui_handlers/bookmarked';

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
$("#new-euclidean-graph-btn").on("click", () => {
    displayNewGraph("empty-euclidean");
});

const graphTabs = new GraphTabs(stage);
new AutoLayout(graphTabs);
new GraphGenerate(graphTabs);
new AutoLabelOptions(graphTabs);
new ImportExport(graphTabs);
new DisplayCustomizer(graphTabs);
new AlgorithmUI(graphTabs);
new BookmarkedGraphs(graphTabs);
