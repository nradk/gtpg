import { Graph } from "../graph_core/graph";
import { Message } from "../ui_handlers/notificationservice";

export type AlgorithmState = "init" | "running" | "paused" | "done";

export class AlgorithmError extends Error {
}

export interface AlgorithmOutput {
    graph: Graph;
    name: string;
    message: Message;
}

export interface Algorithm<I> {
    run(input: I): Generator<void, AlgorithmOutput, void>;
    getFullName(): string;
}

export class AlgorithmRunner<I> {
    private delay: number;
    private timer: ReturnType<typeof setTimeout>;
    private state: AlgorithmState;
    private stateChangeCallback: (newState: AlgorithmState) => void;
    private runnerStep: () => void;

    constructor(protected algorithm: Algorithm<I>) {
        this.delay = 400;
        this.state = "init";
    }

    execute(input: I): Promise<AlgorithmOutput> {
        const iterator = this.algorithm.run(input);
        return new Promise((resolve, _) => {
            this.runnerStep = () => {
                const it = iterator.next();
                if (!it.done) {
                    if (this.state == "running") {
                        this.timer = setTimeout(this.runnerStep, this.delay);
                    }
                } else {
                    this.setState("done");
                    resolve(it.value);
                }
            };
            this.setState("running");
            this.runnerStep();
        });
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

    next() {
        if (this.state != "paused") {
            throw new Error("Algorithm next'd when it wasn't in a paused state.");
        }
        this.timer = setTimeout(this.runnerStep, 0);
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

    run(input: I): AlgorithmOutput {
        const it = this.algorithm.run(input);
        let itRes: IteratorResult<void, AlgorithmOutput>;
        while (!(itRes = it.next()).done);
        return itRes.value;
    }
}
