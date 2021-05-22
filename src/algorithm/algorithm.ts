import { Decorator } from "../decoration/decorator";

export interface Algorithm {
    execute(decorator: Decorator): void;
}
