import $ from 'jquery';

export class TabBar extends HTMLElement {
    tabs: {[id: number]: DocumentFragment};
    private nextId: number;

    constructor() {
        super();
        //const shadow = this.attachShadow({mode: 'open'});
        const template: HTMLTemplateElement = document.querySelector("#tabbar-template");
        const templateFrag = document.importNode(template.content, true);
        this.appendChild(templateFrag);
        this.tabs = {};
        this.nextId = 0;
        this.addTabElement("Untitled 1");
    }

    addTabElement(title: string) {
        const nextId = this.getNextId();
        const template: HTMLTemplateElement = document.querySelector("#tab-template");
        const tabFrag = document.importNode(template.content, true);
        tabFrag.querySelector("a.nav-link slot").innerHTML = title;
        tabFrag.firstElementChild.setAttribute("data-id", "" + nextId);
        tabFrag.firstElementChild.querySelector("a").onclick = () => {
            this.setActiveById(nextId);
        };
        const closeIcon = $(tabFrag.firstElementChild).find("i");
        closeIcon.on('mouseover', () => {
            closeIcon.removeClass("bi-x-square");
            closeIcon.addClass("bi-x-square-fill");
        });
        closeIcon.on('mouseout', () => {
            closeIcon.removeClass("bi-x-square-fill");
            closeIcon.addClass("bi-x-square");
        });
        closeIcon.on('click', () => {
            this.removeById(nextId);
        });
        const container = this.querySelector("#tabbar");
        container.appendChild(tabFrag);
        this.setActiveById(nextId);
    }

    setActiveById(id: number) {
        $("#tabbar").children().children("a").removeClass("active");
        $("#tabbar").children(`li[data-id=${id}]`).children("a").addClass("active");
    }

    setActiveByIndex(index: number) {
        $("#tabbar").children().children("a").removeClass("active");
        $("#tabbar").children().eq(index).children("a").addClass("active");
    }

    removeById(id: number) {
        $("#tabbar").children(`li[data-id=${id}]`).remove();
    }

    getNextId(): number {
        const next = this.nextId;
        this.nextId += 1;
        return next;
    }
}

customElements.define('tab-bar', TabBar);
