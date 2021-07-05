import $ from "jquery";
import GraphTabs from "./graphtabs";
import { GraphDrawing } from "../drawing/graphdrawing";

export default class ImportExport {
    graphTabs: GraphTabs;

    constructor(graphtabs: GraphTabs) {
        this.graphTabs = graphtabs;
        $("#btn-export").on('click', this.exportCurrent.bind(this));
        $("#btn-import").on('click', this.importNew.bind(this));
        $("#new-import-graph-btn").on('click', this.importNew.bind(this));

        $("#graphSaveForm").on("submit", e => {
            const drawing = this.graphTabs.getActiveGraphDrawing();
            $("#saveModal").modal("hide");
            const fileName = $("input#saveFileName").val().toString() + ".json";
            ImportExport.exportGraphDrawing(drawing, fileName.toString());
            e.preventDefault();
        });
    }

    static stripJsonExtension(filename: string) {
        return filename.slice(-4).toLowerCase() == 'json' ? filename.slice(0, -5) : filename;
    }

    exportCurrent() {
        const tabname = this.graphTabs.tabBar.getActiveTabTitle();
        const fileName = tabname.slice(-4).toLowerCase() == 'json' ?
            tabname.slice(0, -5) : tabname;
        $("#saveModal").modal("show");
        $("input#saveFileName").val(fileName);
    }

    importNew() {
        ImportExport.openFilePicker((fileList: FileList) => {
            if (fileList == undefined) {
                return;
            }
            if (fileList.length == 0 || fileList[0].type != 'application/json') {
                alert("Please select a graph json file.");
                return;
            }
            fileList[0].text().then(text => {
                const drawing = GraphDrawing.fromJsonString(text);
                this.createTab(drawing,
                    ImportExport.stripJsonExtension(fileList[0].name));
            }).catch(e => {
                console.error(e);
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

    static exportGraphDrawing(drawing: GraphDrawing, fileName: string) {
        if (drawing == undefined) {
            alert("No graph to save!");
            return;
        }
        if (drawing.getGraph().getNumberOfVertices() == 0) {
            alert("Cannot export an empty graph!");
            return;
        }
        const jsonStr = drawing.toJsonString();
        const blob = new Blob([jsonStr], {type : 'application/json'});
        const url = URL.createObjectURL(blob);
        ImportExport.download(url, fileName);
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
