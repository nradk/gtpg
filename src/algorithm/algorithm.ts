export type AlgorithmState = "init" | "running" | "paused" | "stopped";

export interface Algorithm {
    execute(): void;
    pause(): void;
    resume(): void;
    stop(): void;
    setSpeed(speed: number): void;
    getState(): AlgorithmState;
    setStateChangeCallback(callback: (newState: AlgorithmState) => void): void;
    clearGraphDecoration(): void;
}
