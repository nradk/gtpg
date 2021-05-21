import $ from "jquery";

export class EditWeight {
    constructor() {
        $("#weightEditForm").on("submit", e => {
            const w = $("#inputWeight").val() as number;
            const callback = $("#weightEditForm").data("callback");
            (callback as ((weight: number) => void))(w);
            $("#weightEditModal").modal("hide");
            e.preventDefault();
        });
    }

    static editWeight(callback: (weight: number) => void): void {
        $("#weightEditForm").data("callback", callback);
        $("#weightEditModal").modal();
    }
}

