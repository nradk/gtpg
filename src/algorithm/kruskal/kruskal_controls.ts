export class KruskalControls extends HTMLElement {

    constructor() {
        super();
        //const shadow = this.attachShadow({mode: 'open'});
        const template: HTMLTemplateElement =
            document.querySelector("#kruskal-control-template");
        const templateFrag = document.importNode(template.content, true);
        this.appendChild(templateFrag);
    }
}

customElements.define('kruskal-controls', KruskalControls);
