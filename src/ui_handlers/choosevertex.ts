import $ from "jquery";

export class ChooseVertex {
    constructor() {
        $("#vertexChoiceForm").on("submit", e => {
            const w = Number($("#vertexId").val());
            const callback = $("#vertexChoiceForm").data("callback");
            (callback as ((weight: number) => void))(w);
            $("#vertexChoiceModal").modal("hide");
            e.preventDefault();
        });
    }

    static chooseVertex(callback: (vertexId: number) => void): void {
        $("#vertexChoiceForm").data("callback", callback);
        $("#vertexChoiceModal").modal();
    }
}

