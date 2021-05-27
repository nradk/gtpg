import { Algorithm } from "../algorithm/algorithm";

export abstract class AlgorithmControls extends HTMLElement {
    abstract setAlgorithm(algorithm: Algorithm): void;
}
