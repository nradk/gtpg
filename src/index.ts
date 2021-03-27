import Konva from 'konva';
import './dashboard.css';

import Graph from "./graph";
import { GraphDrawing } from "./drawings";
import { Size } from "./commontypes";
import * as Layouts from "./layouts";

const stage = new Konva.Stage({
    container: 'container',
    width: 1400,
    height: 700,
    draggable: true
});

//const graph = new Graph(true, {
    //1: [2, 3, 4, 5],
    //2: [1, 3, 4, 5],
    //3: [1, 2, 4, 5],
    //4: [1, 2, 3],
    //5: [1, 2, 3],
//});

const graph = new Graph(true, {
    1: [2, 3, 4, 5],
    2: [3, 4, 5],
    3: [4, 5],
    4: [],
    5: [],
});


const stageDims: Size = { width: stage.width(), height: stage.height() };
const layout: Layouts.Layout = Layouts.getLayoutForStageDims("circular",
    stageDims);
const graphDrawing = new GraphDrawing(layout, graph);

const randomLayoutBtn: HTMLElement = document.getElementById("randomBtn");
randomLayoutBtn.onclick = _ => {
    graphDrawing.setLayoutFromLayoutName("random");
    graphDrawing.renderGraph();
};
const circularLayoutBtn: HTMLElement = document.getElementById("circularBtn");
circularLayoutBtn.onclick = _ => {
    graphDrawing.setLayoutFromLayoutName("circular");
    graphDrawing.renderGraph();
};
const gridLayoutBtn: HTMLElement = document.getElementById("gridBtn");
gridLayoutBtn.onclick = _ => {
    graphDrawing.setLayoutFromLayoutName("grid");
    graphDrawing.renderGraph();
};

graphDrawing.renderGraph();
