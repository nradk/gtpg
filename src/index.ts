import Konva from 'konva';
import $ from "jquery";

import 'bootstrap';
import 'bootswatch/dist/lumen/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import Graph from "./graph";
import { GraphDrawing } from "./drawings";
import { Size } from "./commontypes";
import * as Layouts from "./layouts";

// Double-import seemingly necessary
import './custom/tabbar';   // Executes the module, to register custom element
import * as TabBar from './custom/tabbar';  // Actually does the import

function displayNewGraph() {
    console.log("Displaynewgraph");
    const tabbar: TabBar.TabBar = document.querySelector("tab-bar");
    tabbar.addTabElement("New Graph");
    stage.destroyChildren();
    stage.clear();
    graphDrawing = new GraphDrawing(layout, new Graph(true));
    graphDrawing.setStage(stage);
    graphDrawing.renderGraph();
}

const stage = new Konva.Stage({
    container: 'container',
    width: 1400,
    height: 700,
    draggable: true
});

$("#new-graph-btn").on("click", displayNewGraph);

const stageDims: Size = { width: stage.width(), height: stage.height() };
const layout: Layouts.Layout = Layouts.getLayoutForStageDims("circular",
    stageDims);
var graphDrawing: GraphDrawing;

displayNewGraph();
