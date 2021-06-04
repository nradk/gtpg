import { Graph } from "../graph_core/graph";
import { Decorator } from "../decoration/decorator";

export type AlgorithmState = "init" | "running" | "paused" | "done";

export type AlgorithmClassType = new (decorator: Decorator) => Algorithm;

export abstract class Algorithm {
    constructor(protected decorator: Decorator) {
        console.log("Algorithm created, of type" + (typeof this));
    }

    abstract execute(): void;
    abstract pause(): void;
    abstract resume(): void;
    abstract stop(): void;
    abstract setSpeed(speed: number): void;
    abstract getState(): AlgorithmState;
    abstract setStateChangeCallback(callback:
        (newState: AlgorithmState) => void): void;
    abstract clearGraphDecoration(): void;
    abstract getOutputGraph(): Graph;
    abstract getFullName(): string;
    abstract getShortName(): string;
}

/**
 * Abstract class for an algorithm that can take a vertex (for instance, the
 * source vertex for Dijkstra's algorithm or the root for trees) as input from
 * the user before executing.
 */
export abstract class VertexInputAlgorithm extends Algorithm {
    abstract executeOnVertex(inputVertex: number): void;
    execute() {
        throw new Error("You cannot call execute() on a VertexInputAlgorithm!");
    }

}
