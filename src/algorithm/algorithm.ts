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
