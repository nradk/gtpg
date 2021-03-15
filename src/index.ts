import Konva from 'konva';
import './dashboard.css';

type Layout = "circular" | "random";
var layoutGlobal : Layout = "circular";

const randomLayoutBtn : HTMLElement = document.getElementById("randomBtn");
randomLayoutBtn.onclick = _ => {
    layoutGlobal = "random";
    //e.target.classList.add('active');
    render();
};
const circularLayoutBtn : HTMLElement = document.getElementById("circularBtn");
circularLayoutBtn.onclick = _ => {
    layoutGlobal = "circular";
    //e.target.classList.add('active');
    render();
};

const stage = new Konva.Stage({
    container: 'container',
    width: 1400,
    height: 700,
    draggable: true
});

type Point = {
    x: number,
    y: number
};

type Graph = {
    [key: number]: number[];
};

const graph : Graph = {
    1: [2, 3, 4],
    2: [1, 3, 4],
    3: [1, 2, 4],
    4: [1, 2, 3],
    5: [1, 2, 3],
};

type MouseEventCallback = ((e: Konva.KonvaEventObject<MouseEvent>) => void);

class VertexDrawing extends Konva.Circle {

    selected : boolean;
    layer : Konva.Layer;
    moveCallbacks : MouseEventCallback[];
    edgeDrawings : EdgeDrawing[];
    center : Point;

    constructor(x : number, y : number, layer : Konva.Layer) {
        super({
            x: x,
            y: y,
            radius: 15,
            fill: 'white',
            stroke: 'black',
            strokeWidth: 2,
            draggable: true,
        })
        this.selected = false;
        this.layer = layer;
        this.moveCallbacks = [];
        this.edgeDrawings = [];
        this.center = {x: x, y: y};
        this.on('mouseover', function () {
            document.body.style.cursor = 'pointer';
        });
        this.on('mouseout', function () {
            document.body.style.cursor = 'default';
        });
        this.on('dragmove', function (e) {
            this.center.x = this.x();
            this.center.y = this.y();
            this.moveCallbacks.forEach(callback => callback(e));
        });
        this.on('click', function (e) {
            if (vertexSelected) {
                if (vertexSelected == this) {
                    return;
                }
                vertexSelected.unselect();
                toggleEdge(vertexSelected, this);
                vertexSelected = null;
            } else {
                if (this.selected) {
                    this.unselect();
                    vertexSelected = null;
                } else {
                    this.select();
                    vertexSelected = this;
                }
            }
            e.cancelBubble = true;
            this.layer.draw();
        });
        this.on('dblclick', (e) => {
            for (const edge of this.edgeDrawings) {
                edge.destroy();
            }
            const thisKey =  Object.keys(vertexMap).find(key => vertexMap[key] === this);
            for (const key of Object.keys(graph)) {
                const adjList = graph[key];
                adjList.splice(adjList.indexOf(thisKey));
            }
            delete graph[thisKey];
            this.destroy();
            this.layer.draw();
            edgesLayer.draw();
            e.cancelBubble = true;
        });
    }

    select() {
        if (!this.selected) {
            this.stroke('red');
            this.strokeWidth(4);
            this.selected = !this.selected;
        }
    }

    unselect() {
        if (this.selected) {
            this.stroke('black');
            this.strokeWidth(2);
            this.selected = !this.selected;
        }
    }

    addMoveCallBack(callback : MouseEventCallback) {
        this.moveCallbacks.push(callback);
    }

    removeMoveCallback(callback : MouseEventCallback) {
        const idx = this.moveCallbacks.indexOf(callback);
        if (idx >= 0) {
            this.moveCallbacks.splice(idx);
        }
    }

    registerEdgeDrawing(edgeDrawing : EdgeDrawing) {
        this.edgeDrawings.push(edgeDrawing);
    }

    unregisterEdgeDrawing(edgeDrawing : EdgeDrawing) {
        const idx = this.edgeDrawings.indexOf(edgeDrawing);
        if (idx >= 0) {
            this.edgeDrawings.splice(idx);
        }
    }

}

class EdgeDrawing extends Konva.Line {
    start: VertexDrawing;
    end: VertexDrawing;
    layer: Konva.Layer;

    // Third argument is supposed to be 'directed'
    constructor(start: VertexDrawing, end: VertexDrawing, _: boolean,
                layer: Konva.Layer) {
        super({
            points: [start.center.x, start.center.y,
                     end.center.x, end.center.y],
            stroke: 'black',
            strokeWidth: 2,
            lineCap: 'round',
            lineJoin: 'round'
        });
        this.start = start;
        this.end = end;
        this.layer = layer;
        this.start.addMoveCallBack(this.vertexMoveCallback.bind(this));
        this.end.addMoveCallBack(this.vertexMoveCallback.bind(this));
        this.start.registerEdgeDrawing(this);
        this.end.registerEdgeDrawing(this);
    }

    vertexMoveCallback(_ : Konva.KonvaEventObject<MouseEvent>) {
        this.points([this.start.center.x, this.start.center.y,
                     this.end.center.x, this.end.center.y]);
        this.layer.draw();
    }
}


function getVertexDrawingsForLayout(graphAdjList : Graph, layout : Layout) {
    let vertices = {};
    if (layout == "random") {
        for (const v of Object.keys(graphAdjList)) {
            const x = Math.random() * stage.width();
            const y = Math.random() * stage.height();
            const vertex =  new VertexDrawing(x, y, verticesLayer);
            vertices[v] = vertex;
        }
    } else if (layout == "circular") {
        const centerX = stage.width() / 2;
        const centerY = stage.height() / 2;
        const radius = Math.floor(0.8 * Math.min(stage.height(), stage.width())
            / 2);
        const length = Object.keys(graphAdjList).length;
        let r = 0;
        let step = (Math.PI * 2) / length;
        for (const v of Object.keys(graphAdjList)) {
            const x = centerX + Math.cos(r) * radius;
            const y = centerY + Math.sin(r) * radius;
            const vertex =  new VertexDrawing(x, y, verticesLayer);
            vertices[v] = vertex;
            r += step;
        }
    }
    return vertices;
}

// Second argument is supposed to be 'directed'
function getEdgeList(graphAdjList: Graph, _: boolean) {
    // Assume undirected now
    let edges = [];
    for (const v of Object.keys(graphAdjList)) {
        for (const n of graphAdjList[v]) {
            if (n < v) {
                edges.push([n, v]);
            }
        }
    }
    return edges;
}

function drawGraph(graphAdjList : Graph, verticesLayer : Konva.Layer,
                   edgesLayer : Konva.Layer, layout : Layout) {
    const vertexDrawings = getVertexDrawingsForLayout(graphAdjList, layout);
    vertexMap = vertexDrawings;
    const edges = getEdgeList(graphAdjList, false);
    Object.values(vertexDrawings).forEach((vd: VertexDrawing) =>
                                          verticesLayer.add(vd));

    for (const e of edges) {
        const start = vertexDrawings[e[0]];
        const end   = vertexDrawings[e[1]];
        // Assume undirected (third argument)
        const edgeDrawing = new EdgeDrawing(start, end, false, edgesLayer);
        edgesLayer.add(edgeDrawing);
    }
}

function addVertexToCurrentGraph(e : Konva.KonvaEventObject<MouseEvent>) {
    const absolutePosition = e.target.getAbsolutePosition();
    const x = e.evt.offsetX - absolutePosition.x;
    const y = e.evt.offsetY - absolutePosition.y;
    const newKey = Math.max(...Object.keys(graph).map(s => Number(s))) + 1;
    graph[newKey] = [];
    const drawing = new VertexDrawing(x, y, verticesLayer);
    vertexMap[newKey] = drawing;
    verticesLayer.add(drawing);
    verticesLayer.draw();
}

function toggleEdge(start : VertexDrawing, end : VertexDrawing) {
    const startId =  Object.keys(vertexMap).find(key => vertexMap[key] === start);
    const endId   =  Object.keys(vertexMap).find(key => vertexMap[key] === end);
    for (const edgeDrawing of start.edgeDrawings) {
        const endIndex = end.edgeDrawings.indexOf(edgeDrawing);
        if (endIndex >= 0) {
            start.unregisterEdgeDrawing(edgeDrawing);
            end.unregisterEdgeDrawing(edgeDrawing);
            edgeDrawing.destroy();
            edgesLayer.draw();
            graph[startId].splice(graph[startId].indexOf(end));
            graph[endId].splice(graph[endId].indexOf(start));
            return;
        }
    }
    const edgeDrawing = new EdgeDrawing(start, end, false,
        edgesLayer);
    graph[startId].push(endId);
    graph[endId].push(startId);
    edgesLayer.add(edgeDrawing);
    edgesLayer.draw();
}

const verticesLayer = new Konva.Layer();
const edgesLayer = new Konva.Layer();

let vertexSelected = null;

let vertexMap = {};

function render() {
    stage.clear();
    verticesLayer.destroyChildren();
    edgesLayer.destroyChildren();
    stage.destroyChildren();
    drawGraph(graph, verticesLayer, edgesLayer, layoutGlobal);
    stage.add(edgesLayer);
    stage.add(verticesLayer);
    stage.on('click', addVertexToCurrentGraph);
}

render();
