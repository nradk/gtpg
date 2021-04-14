import GraphDrawing from "./drawing/graphdrawing";

export interface GraphDrawingStore {
    getAllGraphDrawingIds(): number[];
    getGraphDrawingById(id: number): GraphDrawing;
    storeGraphDrawing(graphDrawing: GraphDrawing): number;
    deleteGraphDrawing(id: number): boolean;
}

function isInteger(s: string): boolean {
    return !isNaN(parseInt(s));
}

export class LocalGraphDrawingStore implements GraphDrawingStore {

    getAllGraphDrawingIds(): number[] {
        const ids: number[] = [];
        for (var i = 0; i < localStorage.length; i++) {
            if (isInteger(localStorage.key(i))) {
                ids.push(parseInt(localStorage.key(i)));
            }
        }
        return ids;
    }

    getGraphDrawingById(id: number): GraphDrawing {
        return GraphDrawing.fromJsonString(localStorage.getItem(id.toString()));
    }

    storeGraphDrawing(graphDrawing: GraphDrawing): number {
        const allIds = this.getAllGraphDrawingIds();
        var nextId: number;
        if (allIds.length == 0) {
            nextId = 1;
        } else {
            nextId = Math.max(...allIds) + 1;
        }
        localStorage.setItem(nextId.toString(), graphDrawing.toJsonString());
        return nextId;
    }

    deleteGraphDrawing(id: number): boolean {
        if (this.getAllGraphDrawingIds().includes(id)) {
            localStorage.removeItem(id.toString());
            return true;
        }
        return false;
    }
}
