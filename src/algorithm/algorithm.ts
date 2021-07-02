import { Graph } from "../graph_core/graph";
import { Decorator } from "../decoration/decorator";

export type AlgorithmState = "init" | "running" | "paused" | "done";

export interface Algorithm<I> {
    initialize(input: I): void;
    run(): IterableIterator<void>;
    getOutputGraph(): Graph;
    getFullName(): string;
    getShortName(): string;
    getDecorator(): Decorator;
}

export class AlgorithmRunner<I> {
    private delay: number;
    private timer: ReturnType<typeof setTimeout>;
    private state: AlgorithmState;
    private stateChangeCallback: (newState: AlgorithmState) => void;
    private runnerStep: () => void;

    constructor(protected algorithm: Algorithm<I>) {
        console.log("Algorithm created, of type" + (typeof this));
        this.delay = 400;
        this.state = "init";
    }

    execute(input: I): void {
        this.algorithm.initialize(input);
        const iterator = this.algorithm.run();
        const runnerStep = () => {
            const it = iterator.next();
            if (!it.done) {
                if (this.state == "running") {
                    this.timer = setTimeout(runnerStep, this.delay);
                }
            } else {
                this.setState("done");
            }
        };
        this.setState("running");
        runnerStep();
    }

    private setState(state: AlgorithmState) {
        this.state = state;
        this.stateChangeCallback?.(this.state);
    }

    setStateChangeCallback(callback: (newState: AlgorithmState) => void) {
        this.stateChangeCallback = callback;
    }

    pause() {
        clearTimeout(this.timer);
        this.setState("paused");
    }

    resume() {
        if (this.state != "paused") {
            throw new Error("Algorithm resumed when it wasn't in a paused state.");
        }
        this.setState("running");
        this.timer = setTimeout(this.runnerStep, this.delay);
    }

    stop() {
        this.setState("init");
    }

    setSpeed(speed: number) {
        // speed can go from 0 to 100
        // That corresponds to a delay from 2s to 1ms
        this.delay = 1 + (2000 - 1) * (1 - speed / 100);
    }

    getState(): AlgorithmState {
        return this.state;
    }

    getAlgorithm(): Algorithm<I> {
        return this.algorithm;
    }
}

export class HeadlessRunner<I> {
    constructor(private algorithm: Algorithm<I>) {
    }

    run(input: I): Graph {
        this.algorithm.initialize(input);
        const it = this.algorithm.run();
        while (!it.next().done);
        return this.algorithm.getOutputGraph();
    }
}
