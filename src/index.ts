import Konva from 'konva';
import './dashboard.css';

import Graph from "./graph";
import { GraphDrawing } from "./drawings";

const stage = new Konva.Stage({
    container: 'container',
    width: 1400,
    height: 700,
    draggable: true
});

const graph = new Graph({
    1: [2, 3, 4],
    2: [1, 3, 4],
    3: [1, 2, 4],
    4: [1, 2, 3],
    5: [1, 2, 3],
});

const graphDrawing = new GraphDrawing(stage, graph);

const randomLayoutBtn: HTMLElement = document.getElementById("randomBtn");
randomLayoutBtn.onclick = _ => {
    graphDrawing.renderGraph("random");
};
const circularLayoutBtn: HTMLElement = document.getElementById("circularBtn");
circularLayoutBtn.onclick = _ => {
    graphDrawing.renderGraph("circular");
};

graphDrawing.renderGraph("circular");
