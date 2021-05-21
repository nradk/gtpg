import $ from "jquery";
import GraphTabs from "./graphtabs";
import GraphDrawing from "../drawing/graphdrawing";

export default class ImportExport {
    graphTabs: GraphTabs;

    constructor(graphtabs: GraphTabs) {
        this.graphTabs = graphtabs;
        $("#btn-export").on('click', this.exportCurrent.bind(this));
        $("#btn-import").on('click', this.importNew.bind(this));
        $("#new-import-graph-btn").on('click', this.importNew.bind(this));
    }

    exportCurrent() {
        const drawing = this.graphTabs.getActiveGraphDrawing();
        if (drawing == undefined) {
            alert("No graph to save!");
            return;
        }
        if (drawing.graph.getNumberOfVertices() == 0) {
            alert("Cannot export an empty graph!");
            return;
        }
        const tabname = this.graphTabs.tabBar.getActiveTabTitle();
        const jsonStr = drawing.toJsonString();
        const blob = new Blob([jsonStr], {type : 'application/json'});
        const url = URL.createObjectURL(blob);
        const fileName = tabname.slice(-4) == 'json' ? tabname : tabname + ".json";
        ImportExport.download(url, fileName);
    }

    importNew() {
        ImportExport.openFilePicker((fileList: FileList) => {
            if (fileList == undefined) {
                return;
            }
            console.log(fileList);
            if (fileList.length == 0 || fileList[0].type != 'application/json') {
                alert("Please select a graph json file.");
                return;
            }
            fileList[0].text().then(text => {
                console.log(text);
                const drawing = GraphDrawing.fromJsonString(text);
                this.createTab(drawing, fileList[0].name);
            }).catch(e => {
                console.log(e);
                alert("Error when reading file!");
            });;
        });
    }

    createTab(drawing: GraphDrawing, title: string) {
        const tabbar = this.graphTabs.getTabBar();
        const newId = tabbar.addTabElement(title, "loaded");
        tabbar.setActiveById(newId);
        this.graphTabs.updateGraphDrawing(newId, drawing);
    }

    static download(url: string, filename: string) {
        const element = document.createElement('a');
        element.setAttribute('href', url);
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    static openFilePicker(callback: (fileList: FileList) => void) {
        const element = document.createElement('input');
        element.setAttribute('type', 'file');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        element.addEventListener('change', _ => {
            callback(element.files);
        });
        document.body.removeChild(element);
    }
}

