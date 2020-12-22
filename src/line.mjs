export class Line extends HTMLElement {

    constructor(content) {
        super();
        this.content = content;
    }

    get content() {
        return this.textContent;
    }

    set content(val) {
        this.textContent = val;
    }
}

customElements.define('ted-line', Line);