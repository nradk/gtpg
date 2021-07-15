import { Algorithm, AlgorithmError, AlgorithmOutput } from "../algorithm";
import { Decorator } from "../../decoration/decorator";
import { EuclideanGraph } from "../../graph_core/euclidean_graph";
import { VertexInput } from  "../../commontypes";

export abstract class TSPApprox implements Algorithm<VertexInput> {
    protected startVertex: number;

    constructor(protected decorator: Decorator) {
    }

    protected initialize(input: VertexInput) {
        const graph = this.decorator.getGraph();
        if (!(graph instanceof EuclideanGraph)) {
            throw new AlgorithmError("Only Euclidean graphs are supported!");
        }
        if (graph.getNumberOfVertices() < 2) {
            throw new AlgorithmError("At least 2 vertices are required!");
        }
        this.startVertex = input.vertexId;
    }

    abstract run(input: VertexInput): Generator<void, AlgorithmOutput, void>;
    abstract getFullName(): string;
    abstract getShortName(): string;
    abstract getDecorator(): Decorator;
}
