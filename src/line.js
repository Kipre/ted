import {config} from './config.js';

export class Line extends HTMLElement {

    constructor(content) {
        super();
        this.content = content;

    }

    get content() {
        return this.textContent;
    }

    set content(val) {
        if (val?.codePointAt(0) == 0) {
            this.innerHTML = '';
            this.classList.remove('counted');
        } else {
            this.textContent = val;
            this.classList.add('counted');
        }
    }

    set(val) {
        if (val !== String.fromCodePoint(0)) {
            this.innerHTML = val;
            this.classList.add('counted');
        } else {
            this.innerHTML = '';
            this.classList.remove('counted');
        }
    }
}

customElements.define('ted-line', Line);
