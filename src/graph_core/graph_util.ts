import { HeadlessRunner } from "../algorithm/algorithm";
import { HeadlessDecorator } from "../decoration/decorator";
import { BreadthFirstSearch } from "../algorithm/search/bfs";
import { Weighted, Graph, UnweightedGraph, WeightedGraph } from "./graph";
import { EuclideanGraph } from "./euclidean_graph";

export function isSingleComponent(graph: Graph): boolean {
    if (graph instanceof EuclideanGraph) {
        return true;
    }
    const start = graph.getVertexIds().values().next().value;
    const bfs = new BreadthFirstSearch(new HeadlessDecorator(graph));
    const output = (new HeadlessRunner(bfs)).run({ vertexId: start });
    return output.graph.getVertexIds().size == graph.getVertexIds().size;
}

// Create a graph from a path (a list of vertex ids). Take labels from the
// graph provided as the second argument. Includes edge weights if the given
// graph is weighted.
export function createGraphFromPath(path: number[], labelsFrom: Graph): Graph {
    const graph = labelsFrom;
    const outGraph = graph.isWeighted() ? new WeightedGraph(true) :
        new UnweightedGraph(true);
    outGraph.addVertex(path[0], graph.getVertexLabel(path[0]));
    for (let i = 1; i < path.length; i++) {
        // The following 'if' guard is necessary for paths that are
        // circuits, because the last vertex will be the same as the first
        // vertex.
        if (!outGraph.getVertexIds().has(path[i])) {
            outGraph.addVertex(path[i], graph.getVertexLabel(path[i]));
        }
        outGraph.addEdge(path[i - 1], path[i]);
        if (graph.isWeighted()) {
            const inGraphW = (graph as Weighted & Graph);
            const outGraphW = (outGraph as Weighted & Graph);
            outGraphW.setEdgeWeight(path[i - 1], path[i],
                inGraphW.getEdgeWeight(path[i - 1], path[i]));
        }
    }
    return outGraph;
}

export function completeGraph(numVertices: number, weighted: boolean): Graph {
    if (numVertices <= 0) {
        throw new Error("Need at least one vertex!");
    }
    const graph = weighted ? new WeightedGraph(false) : new UnweightedGraph(false);
    for (let i = 1; i <= numVertices; i++) {
        graph.addVertex(i, i.toString());
    }
    for (let i = 1; i <= numVertices; i++) {
        for (let j = i + 1; j <= numVertices; j++) {
            graph.addEdge(i, j);
        }
    }
    return graph;
}

export function completeBipartiteGraph(leftVertices: number, rightVertices: number,
        weighted: boolean, directed: boolean): Graph {
    if (leftVertices <= 0 || rightVertices <= 0) {
        throw new Error("Need at least one vertex on each side!");
    }
    const graph = weighted ? new WeightedGraph(directed) : new UnweightedGraph(directed);
    for (let i = 1; i <= leftVertices + rightVertices; i++) {
        graph.addVertex(i, i.toString());
    }
    for (let i = 1; i <= leftVertices; i++) {
        for (let j = 1; j <= rightVertices; j++) {
            graph.addEdge(i, leftVertices + j);
        }
    }
    return graph;
}
