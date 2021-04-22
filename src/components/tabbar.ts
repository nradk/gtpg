import $ from 'jquery';

export type TabType = "empty-directed" | "empty-undirected" | "generated" | "loaded";

export type TabEventCallback = (id: number) => void;
export type TabCreatedCallback = (id: number, tabType: TabType) => void;

export class TabBar extends HTMLElement {
    private nextId: number;
    private tabActivatedCallback: TabEventCallback;
    private tabDeactivatedCallback: TabEventCallback;
    private tabClosedCallback: TabEventCallback;
    private tabCreatedCallback: TabCreatedCallback;

    constructor() {
        super();
        //const shadow = this.attachShadow({mode: 'open'});
        const template: HTMLTemplateElement = document.querySelector("#tabbar-template");
        const templateFrag = document.importNode(template.content, true);
        this.appendChild(templateFrag);
        this.nextId = 0;
    }

    setTabDeactivatedCallback(tabDeactivatedCallback: TabEventCallback) {
        this.tabDeactivatedCallback = tabDeactivatedCallback;
    }

    setTabActivatedCallback(tabActivatedCallback: TabEventCallback) {
        this.tabActivatedCallback = tabActivatedCallback;
    }

    setTabClosedCallback(tabClosedCallback: TabEventCallback) {
        this.tabClosedCallback = tabClosedCallback;
    }

    setTabCreatedCallback(tabCreatedCallback: TabCreatedCallback) {
        this.tabCreatedCallback = tabCreatedCallback;
    }

    addTabElement(title: string, tabType: TabType): number {
        const id = this.getNextId();
        const template: HTMLTemplateElement = document.querySelector("#tab-template");
        const tabFrag = document.importNode(template.content, true);
        tabFrag.querySelector("a.nav-link slot").innerHTML = title;
        tabFrag.firstElementChild.setAttribute("data-id", "" + id);
        tabFrag.firstElementChild.querySelector("a").onclick = () => {
            const active = this.getActiveTabId();
            if (active != id) {
                this.setActiveById(id);
            }
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
        closeIcon.on('click', (event) => {
            const activeTabId = this.getActiveTabId();
            if (id == activeTabId) {
                // Active tab was closed, so call deactivated callback
                this.tabDeactivatedCallback?.(id);
                this.removeById(id);
                this.tabClosedCallback?.(id);
                const lastTabId = this.getLastTabId();
                if (lastTabId != undefined) {
                    this.setActiveById(lastTabId);
                }
            } else {
                this.removeById(id);
                this.tabClosedCallback?.(id);
            }
            event.stopPropagation();
        });
        const container = this.querySelector("#tabbar");
        container.appendChild(tabFrag);
        this.tabCreatedCallback(id, tabType);
        return id;
    }

    containsTabWithId(id: number) {
        return $("#tabbar").children(`li[data-id=${id}]`) != undefined;
    }

    setActiveById(id: number) {
        const prevActive = this.getActiveTabId();
        if (prevActive != undefined) {
            this.tabDeactivatedCallback?.(prevActive);
        }
        $("#tabbar").children().children("a").removeClass("active");
        $("#tabbar").children(`li[data-id=${id}]`).children("a").addClass("active");
        this.tabActivatedCallback?.(id);
    }

    getLastTabId() {
        const id = $("#tabbar").children("li").last().attr("data-id");
        return id ? parseInt(id) : undefined;
    }

    getActiveTabId(): number {
        const id = $("#tabbar").find("a.active").parent().attr("data-id");
        return id ? parseInt(id) : undefined;
    }

    getActiveTabTitle(): string {
        return $("#tabbar").find("a.active").children("slot").html();
    }

    removeById(id: number) {
        $("#tabbar").children(`li[data-id=${id}]`).remove();
    }

    private getNextId(): number {
        const next = this.nextId;
        this.nextId += 1;
        return next;
    }
}

customElements.define('tab-bar', TabBar);
