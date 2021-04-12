import Konva from 'konva';
import $ from "jquery";

import 'bootstrap';
import 'bootswatch/dist/lumen/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

import GraphTabs from "./graphtabs";

// Double-import seemingly necessary
import './custom/tabbar';   // Executes the module, to register custom element
import * as TabBar from './custom/tabbar';  // Actually does the import

function displayNewGraph() {
    const tabbar: TabBar.TabBar = document.querySelector("tab-bar");
    const newId = tabbar.addTabElement("New Graph");
    tabbar.setActiveById(newId);
}

const stage = new Konva.Stage({
    container: 'container',
    width: 1400,
    height: 700,
    draggable: true
});

$("#new-graph-btn").on("click", () => {
    console.log("newgraphbutnclicked");
    displayNewGraph();
});
new GraphTabs(stage);
