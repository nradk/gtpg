import $ from "jquery";

export  type MessageLevel = "info" | "warning" | "failure" | "success";
export interface Message {
    level: MessageLevel;
    text: string;
    title: string;
}

export function showMessage(message: Message) {
    $(".toast").removeClass('text-white bg-warning bg-primary bg-success bg-danger');
    if (message.level == "warning") {
        $(".toast").addClass('text-white bg-warning');
    } else if (message.level == "info") {
        $(".toast").addClass('text-white bg-primary');
    } else if (message.level == "success") {
        $(".toast").addClass('text-white bg-success');
    } else if (message.level == "failure") {
        $(".toast").addClass('text-white bg-danger');
    }
    $(".toast").find("#toast-title").text(message.title);
    $(".toast").find(".toast-body").text(message.text);
    $(".toast").toast('show');
}

export function showWarning(title: string, text: string) {
    showMessage({ level: "warning", text: text, title: title});
}

export function showInfo(title: string, text: string) {
    showMessage({ level: "info", text: text, title: title});
}

export function showStatus(text: string) {
    $("#statusLine").html('');
    const $element = $('<span>');
    $element.html(text);
    $element.hide();
    $("#statusLine").append($element);
    $element.fadeIn();
}
