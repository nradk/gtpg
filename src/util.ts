import GraphTabs from "./ui_handlers/graphtabs";
import GraphDrawing from "./drawing/graphdrawing";
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
