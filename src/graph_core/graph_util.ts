import { HeadlessRunner } from "../algorithm/algorithm";
import { HeadlessDecorator } from "../decoration/decorator";
import { BreadthFirstSearch } from "../algorithm/search/bfs";
import { Graph } from "./graph";

export function isSingleComponent(graph: Graph): boolean {
    const start = graph.getVertexIds().values().next().value;
    const bfs = new BreadthFirstSearch(new HeadlessDecorator(graph));
    const tree = (new HeadlessRunner(bfs)).run({ vertexId: start });
    return tree.getVertexIds().size == graph.getVertexIds().size;
}

