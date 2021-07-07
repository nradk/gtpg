import { Heap } from 'heap-js';

import { Algorithm, AlgorithmError } from "../algorithm";
import { SourceSinkInput } from "../../commontypes";
import { Decorator } from "../../decoration/decorator";
import { WeightedGraph, Weighted, Graph } from "../../graph_core/graph";
import { DecorationState } from "../../decoration/decorator";
import { getNumStringForLabels } from "../../util";

export class EdmondsKarpAlgorithm implements Algorithm<SourceSinkInput> {

    constructor(private decorator: Decorator) {
    }

    initialize(startVertex: SourceSinkInput) {
        const graph = this.decorator.getGraph();
        if (!graph.isWeighted() || !graph.isDirected()) {
            throw new AlgorithmError("Edmonds-Karp algorithm needs a weighted directed graph!");
        }

        for (const edge of graph.getEdgeList()) {
            this.decorator.setEdgeState(edge[0], edge[1], DecorationState.DISABLED);
        }
    }

    *run() {
        return null;
    }

    getOutputGraph() {
        return null;
    }

    getFullName() {
        return "Edmonds-Karp Maximum Network Flow Algorithm";
    }

    getShortName() {
        return "Edmonds-Karp";
    }

    getDecorator() {
        return this.decorator;
    }
}
