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
