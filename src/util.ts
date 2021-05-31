import GraphTabs from "./ui_handlers/graphtabs";
import GraphDrawing from "./drawing/graphdrawing";

export function createTabWithGraphDrawing(graphTabs: GraphTabs,
        graphDrawing: GraphDrawing, title: string) {
    const tabbar = graphTabs.getTabBar();
    const newId = tabbar.addTabElement(title, "generated");
    tabbar.setActiveById(newId);
    graphTabs.updateGraphDrawing(newId, graphDrawing);
}
