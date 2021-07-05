import { Algorithm, AlgorithmError } from "../algorithm";
import { Graph } from "../../graph_core/graph";
import { Decorator } from "../../decoration/decorator";
import { EuclideanGraph } from "../../graph_core/euclidean_graph";

export abstract class TSPApprox implements Algorithm<void> {
    constructor(protected decorator: Decorator) {
    }

    initialize() {
        const graph = this.decorator.getGraph();
        if (!(graph instanceof EuclideanGraph)) {
            throw new AlgorithmError("Only Euclidean graphs are supported!");
        }
        if (graph.getNumberOfVertices() < 2) {
            throw new AlgorithmError("At least 2 vertices are required!");
        }
    }

    abstract run(): IterableIterator<void>;
    abstract getOutputGraph(): Graph;
    abstract getFullName(): string;
    abstract getShortName(): string;
    abstract getDecorator(): Decorator;
}
