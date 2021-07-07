import { HeadlessRunner } from "../algorithm/algorithm";
import { HeadlessDecorator } from "../decoration/decorator";
import { BreadthFirstSearch } from "../algorithm/search/bfs";
import { Graph, UnweightedGraph } from "./graph";
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

export function createOutputGraph(path: number[], labelsFrom: Graph): Graph {
    const outGraph = new UnweightedGraph(true);
    const graph = labelsFrom;
    outGraph.addVertex(path[0], graph.getVertexLabel(path[0]));
    for (let i = 1; i < path.length; i++) {
        // The following 'if' guard is necessary for paths that are
        // circuits, because the last vertex will be the same as the first
        // vertex.
        if (!outGraph.getVertexIds().has(path[i])) {
            outGraph.addVertex(path[i], graph.getVertexLabel(path[i]));
        }
        outGraph.addEdge(path[i - 1], path[i]);
    }
    return outGraph;
}

