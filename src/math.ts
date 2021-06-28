import { VectorPolar, Vector2, Util } from "./commontypes";

// Returns the counter-clockwise angle (in radians) that the vector makes with
// the x-axis. Return value in [0, 2pi)
export function polarAngle(vector: Vector2): number {
    const theta = Math.atan2(vector[1], vector[0]);
    return theta < 0 ? 2 * Math.PI + theta : theta;
}

// Get the euclidean magnitude of the vector
export function magnitude(vector: Vector2): number {
    return Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);
}

// Get the polar representation of the vector (as [magnitude, angle])
export function getPolarVector(vector: Vector2): VectorPolar {
    return [magnitude(vector), polarAngle(vector)];
}

// Arguments must be in the range [0, 2pi)
export function getAngleDistance(alpha: number, beta: number): number {
    let d = Math.abs(beta - alpha);
    while (d > 2 * Math.PI) {
        d -= 2 * Math.PI;
    }
    if (d > Math.PI) {
        d = 2 * Math.PI - d;
    }
    return d;
}

export function getAngleDifference(alpha: number, beta: number): number {
    const d = alpha - beta;
    return d < 0 ? 2 * Math.PI + d: d;
}

// Given an array of vectors, return a vector that bisects the highest angle
// distance between two circularly (??) consecutive vectors in the array.
export function getBestGapVector(vectors: Vector2[]): Vector2 {
    // For a single vector, return its negation, i.e. literally the opposite
    // direction.
    if (vectors.length == 1) {
        return Util.scalarVectorMultiply(-1, Util.getNormalized(vectors[0]));
    }
    const polarVectors: VectorPolar[] = vectors.map(getPolarVector);
    polarVectors.sort((a, b) => a[1] - b[1]);
    let maxI = 0;
    let maxD = 0;
    for (let i = 0; i < polarVectors.length; i++) {
        let j = i == polarVectors.length - 1 ? 0 : i + 1;
        const d = getAngleDifference(polarVectors[j][1], polarVectors[i][1]);
        if (d > maxD) {
            maxD = d;
            maxI = i;
        }
    }
    let midWayAngle = polarVectors[maxI][1] + (maxD / 2);
    if (midWayAngle >= 2 * Math.PI) {
        midWayAngle = midWayAngle - 2 * Math.PI;
    }
    return [Math.cos(midWayAngle), Math.sin(midWayAngle)];
}
