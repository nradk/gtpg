var layoutGlobal = "circular";

const randomLayoutBtn = document.getElementById("randomBtn");
randomLayoutBtn.onclick = e => {
    layoutGlobal = "random";
    //e.target.classList.add('active');
    render();
};
const circularLayoutBtn = document.getElementById("circularBtn");
circularLayoutBtn.onclick = e => {
    layoutGlobal = "circular";
    //e.target.classList.add('active');
    render();
};

var stage = new Konva.Stage({
    container: 'container',
    width: 1400,
    height: 700,
    draggable: true
});

const graph = {
    1: [2, 3, 4],
    2: [1, 3, 4],
    3: [1, 2, 4],
    4: [1, 2, 3],
    5: [1, 2, 3],
};

class VertexDrawing extends Konva.Circle {
    constructor(x, y, layer) {
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

    addMoveCallBack(callback) {
        this.moveCallbacks.push(callback);
    }

    removeMoveCallback(callback) {
        const idx = this.moveCallbacks.indexOf(callback);
        if (idx >= 0) {
            this.moveCallbacks.splice(idx);
        }
    }

    registerEdgeDrawing(edgeDrawing) {
        this.edgeDrawings.push(edgeDrawing);
    }

    unregisterEdgeDrawing(edgeDrawing) {
        const idx = this.edgeDrawings.indexOf(edgeDrawing);
        if (idx >= 0) {
            this.edgeDrawings.splice(idx);
        }
    }

}

class EdgeDrawing extends Konva.Line {
    constructor(vertexDrawing1, vertexDrawing2, directed, layer) {
        super({
            points: [vertexDrawing1.center.x, vertexDrawing1.center.y,
                     vertexDrawing2.center.x, vertexDrawing2.center.y],
            stroke: 'black',
            strokeWidth: 2,
            lineCap: 'round',
            lineJoin: 'round'
        });
        this.start = vertexDrawing1;
        this.end = vertexDrawing2;
        this.layer = layer;
        this.start.addMoveCallBack(this.vertexMoveCallback.bind(this));
        this.end.addMoveCallBack(this.vertexMoveCallback.bind(this));
        this.start.registerEdgeDrawing(this);
        this.end.registerEdgeDrawing(this);
    }

    vertexMoveCallback(e) {
        this.points([this.start.center.x, this.start.center.y,
                     this.end.center.x, this.end.center.y]);
        this.layer.draw();
    }
}

function getVertexDrawingsForLayout(graphAdjList, layout) {
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

function getEdgeList(graphAdjList, directed) {
    // Assume undirected now
    let edges = [];
    for (v of Object.keys(graphAdjList)) {
        for (const n of graphAdjList[v]) {
            if (n < v) {
                edges.push([n, v]);
            }
        }
    }
    return edges;
}

function drawGraph(graphAdjList, verticesLayer, edgesLayer, layout) {
    const vertexDrawings = getVertexDrawingsForLayout(graphAdjList, layout);
    vertexMap = vertexDrawings;
    const edges = getEdgeList(graphAdjList, false);
    Object.values(vertexDrawings).forEach(vd => verticesLayer.add(vd));

    for (const e of edges) {
        const start = vertexDrawings[e[0]];
        const end   = vertexDrawings[e[1]];
        // Assume undirected (third argument)
        const edgeDrawing = new EdgeDrawing(start, end, false, edgesLayer);
        edgesLayer.add(edgeDrawing);
    }
}

function addVertexToCurrentGraph(e) {
    const pointer = stage.getPointerPosition();
    const x = e.evt.layerX - shiftX;
    const y = e.evt.layerY - shiftY;
    const newKey = Math.max(Object.keys(graph)) + 1;
    graph[newKey] = [];
    const drawing = new VertexDrawing(x, y, verticesLayer);
    vertexMap[newKey] = drawing;
    verticesLayer.add(drawing);
    verticesLayer.draw();
}

function toggleEdge(vertexDrawing1, vertexDrawing2) {
    const start =  Object.keys(vertexMap).find(key => vertexMap[key] === vertexDrawing1);
    const end   =  Object.keys(vertexMap).find(key => vertexMap[key] === vertexDrawing2);
    for (const edgeDrawing of vertexDrawing1.edgeDrawings) {
        const endIndex = vertexDrawing2.edgeDrawings.indexOf(edgeDrawing);
        if (endIndex >= 0) {
            vertexDrawing1.unregisterEdgeDrawing(edgeDrawing);
            vertexDrawing2.unregisterEdgeDrawing(edgeDrawing);
            edgeDrawing.destroy();
            edgesLayer.draw();
            graph[start].splice(graph[start].indexOf(end));
            graph[end].splice(graph[end].indexOf(start));
            return;
        }
    }
    const edgeDrawing = new EdgeDrawing(vertexDrawing1, vertexDrawing2, false,
        edgesLayer);
    graph[start].push(end);
    graph[end].push(start);
    edgesLayer.add(edgeDrawing);
    edgesLayer.draw();
}

let verticesLayer = new Konva.Layer();
let edgesLayer = new Konva.Layer();

let dragStartX, dragStartY;
let shiftX = 0, shiftY = 0;

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
    stage.on('dragstart', e => {
        if (e.target == stage) {
            dragStartX = e.evt.x;
            dragStartY = e.evt.y;
        }
    });
    stage.on('dragend', e => {
        if (e.target == stage) {
            shiftX += e.evt.x - dragStartX;
            shiftY += e.evt.y - dragStartY;
        }
    });
    stage.on('click', addVertexToCurrentGraph);
}

render();
