import GraphTabs from "./ui_handlers/graphtabs";
import { GraphDrawing } from "./drawing/graphdrawing";
import { Point } from "./commontypes";

export function createTabWithGraphDrawing(graphTabs: GraphTabs,
        graphDrawing: GraphDrawing, title: string) {
    const tabbar = graphTabs.getTabBar();
    const newId = tabbar.addTabElement(title, "generated");
    tabbar.setActiveById(newId);
    graphTabs.updateGraphDrawing(newId, graphDrawing);
}

export function getPosition(el: HTMLElement): Point {
    for (var lx=0, ly=0;
         el != null;
         lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent as HTMLElement);
    return {x: lx,y: ly};
}

// Maps 1 to A, 2 to B, and so on. Maps 27 to AA and so on.
// Negative values are 'abs'ed and float values are rounded. NaN and
// +/-Infinity will cause the function to throw an Error. 0 will be mapped to
// an empty string, which may or may not be the desired behavior.
export function getLetterFromInteger(n: number, uppercase: boolean): string {
    if (!isFinite(n)) {
        throw new Error("Invalid (non-finite) value passed!");
    }
    let integer = Math.abs(Math.round(n));
    const a = uppercase ? 'A' : 'a';
    const intToChar = (i: number) => String.fromCharCode(a.charCodeAt(0) + i);
    let s = '';
    while (integer > 0) {
        const lsl = (integer - 1) % 26;
        s = intToChar(lsl) + s;
        integer = Math.floor((integer - (lsl + 1)) / 26);
    }
    return s;
}

// Returns all nonnegative integers of width n bits with exactly k bits set.
export function combinationBits(n: number, k: number): Set<number> {
    if (k > n) {
        return new Set<number>([]);
    }
    if (k == 0) {
        return new Set<number>([0]);
    }
    const k_1bits = combinationBits(n - 1, k - 1);
    const kbits = combinationBits(n - 1, k);
    const out = new Set<number>();
    for (const i of k_1bits) {
        out.add(i | (1 << (n - 1)));
    }
    kbits.forEach(i => out.add(i));
    return out;
}

export function getTwoLevelKeyList(obj: {[k1: number]: {[k2: number]: any}}): number[][] {
    const keys: number[][] = [];
    for (const f of Object.keys(obj)) {
        for (const t of Object.keys(obj[f])) {
            keys.push([parseInt(f), parseInt(t)]);
        }
    }
    return keys;
}

// Convert the given number to a shrot(ish) string for display on a label or
// as weight. Integers are converted the way you'd expect (decimal, without
// leading zeros). Floats are limited to up to two digits after the decimal
// point).
export function getNumStringForLabels(n: number) {
    return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}
