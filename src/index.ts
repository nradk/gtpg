import Konva from 'konva';
import './dashboard.css';

import Graph from "./graph";
import { GraphDrawing } from "./drawings";
import { Size } from "./commontypes";
import * as Layouts from "./layouts";
import { LocalGraphDrawingStore } from "./graphstore";

function setupButtons() {
    randomLayoutBtn.onclick = _ => {
        graphDrawing.setLayoutFromLayoutName("random");
        graphDrawing.renderGraph();
        if (timer != -1) {
            window.clearInterval(timer);
        }

    };
    circularLayoutBtn.onclick = _ => {
        graphDrawing.setLayoutFromLayoutName("circular");
        graphDrawing.renderGraph();
        if (timer != -1) {
            window.clearInterval(timer);
        }
    };
    gridLayoutBtn.onclick = _ => {
        graphDrawing.setLayoutFromLayoutName("grid");
        graphDrawing.renderGraph();
        if (timer != -1) {
            window.clearInterval(timer);
        }
    };
    forceBasedLayoutBtn.onclick = _ => {
        graphDrawing.setLayoutFromLayoutName("forcebased");
        graphDrawing.renderGraph();
        timer = window.setInterval(() => {
            graphDrawing.redrawGraph();
        }, 40);
    };
    graphSaveBtn.onclick = saveCurrentGraph;
    graphDeleteBtn.onclick = deleteCurrentGraph;
    newGraphBtn.onclick = displayNewGraph;
};

var randomLayoutBtn: HTMLElement = document.getElementById("randomBtn");
var circularLayoutBtn: HTMLElement = document.getElementById("circularBtn");
var gridLayoutBtn: HTMLElement = document.getElementById("gridBtn");
var forceBasedLayoutBtn: HTMLElement = document.getElementById("forceBasedBtn");
var graphSaveBtn: HTMLElement = document.getElementById("save-btn");
var graphDeleteBtn: HTMLElement = document.getElementById("delete-btn");
var newGraphBtn: HTMLElement = document.getElementById("new-graph-btn");

var graphNameEl: HTMLElement = document.getElementById("graph-name");
var graphListEl: HTMLElement = document.getElementById("saved-graphs-list");

const store = new LocalGraphDrawingStore();

var timer = -1;

function htmlToElement(html: string): Element {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstElementChild;
}

function getGraphListItem(graphId: number): Element {
    return htmlToElement(`
    <li class="nav-item">
    <a class="nav-link" href="#">
    <span data-feather="file-text"> </span>
    Graph ${graphId}</a>
    </li>
    `);
}

function populateSavedGraphs() {
    graphListEl.innerHTML = '';
    const savedGraphs: number[] = store.getAllGraphDrawingIds();
    for (var i = 0; i < savedGraphs.length; i++) {
        const id = savedGraphs[i];
        const listItem = getGraphListItem(id);
        listItem.getElementsByTagName("a")[0].onclick = function () {
            setGraphDisplay(id);
        };
        graphListEl.appendChild(listItem);
    }
}

function setGraphLabel(label: string) {
    graphNameEl.innerHTML = label;
}

function setGraphDisplay(id: number) {
    setGraphLabel("Graph " + id);
    currentId = id;
    graphDrawing = store.getGraphDrawingById(id);
    stage.destroyChildren();
    stage.clear();
    graphDrawing.setStage(stage);
    graphDrawing.renderGraph();
}

function saveCurrentGraph() {
    const newId = store.storeGraphDrawing(graphDrawing);
    setGraphLabel("Graph " + newId);
    populateSavedGraphs();
}

function deleteCurrentGraph() {
    if (currentId < 0) {
        alert("Graph has not been saved yet, cannot delete!");
    } else {
        store.deleteGraphDrawing(currentId);
        populateSavedGraphs();
        displayFirstSavedGraph();
    }
}

function displayFirstSavedGraph() {
    const savedGraphs: number[] = store.getAllGraphDrawingIds();
    for (var i = 0; i < savedGraphs.length; i++) {
        const id = savedGraphs[i];
        setGraphDisplay(id);
        break;
    }
}

function displayNewGraph() {
    setGraphLabel("Unsaved Graph");
    currentId = -1;
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

const stageDims: Size = { width: stage.width(), height: stage.height() };
const layout: Layouts.Layout = Layouts.getLayoutForStageDims("circular",
    stageDims);
var graphDrawing: GraphDrawing;
var currentId: number = -1;

populateSavedGraphs();
setupButtons();

displayNewGraph();
