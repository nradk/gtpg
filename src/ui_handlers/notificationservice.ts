import $ from "jquery";

export function showWarning(title: string, text: string) {
    $(".toast").find("#toast-title").text(title);
    $(".toast").find(".toast-body").text(text);
    $(".toast").toast('show');
}
