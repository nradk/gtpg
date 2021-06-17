import $ from "jquery";

export function showWarning(title: string, text: string) {
    $(".toast").removeClass('text-white bg-warning bg-primary');
    $(".toast").addClass('text-white bg-warning');
    $(".toast").find("#toast-title").text(title);
    $(".toast").find(".toast-body").text(text);
    $(".toast").toast('show');
}

export function showMessage(title: string, text: string) {
    $(".toast").removeClass('text-white bg-warning bg-primary');
    $(".toast").addClass('text-white bg-primary');
    $(".toast").find("#toast-title").text(title);
    $(".toast").find(".toast-body").text(text);
    $(".toast").toast('show');
}
