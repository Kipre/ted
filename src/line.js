import {config} from './config.js';

const categories = ['nothing', "property", "variable-builtin", "variable", "string", "function-method", "variable-parameter", "operator", "keyword", "function", 'number', 'comment', 'constant-builtin', "string-special", "embedded", "punctuation-special", "constructor", "constant", "function-builtin", "escape", "keyword-argument", "type"];


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

    clear() {
        while (this.firstChild) {
            this.removeChild(this.lastChild);
        }
    }

    set(val, cats) {
        this.innerHTML = '';
        if (val !== String.fromCodePoint(0)) {
            if (cats) {
                let curCategory = 0, span = '';
                for (let i = 0; i <= val.length; i++) {
                    if (curCategory == cats[i]) {
                        span += val[i];
                    } else {
                        const domSpan = document.createElement('span');
                        domSpan.textContent = span;
                        domSpan.classList.add(categories[curCategory]);
                        this.appendChild(domSpan);
                        span = val[i];
                        curCategory = cats[i];
                    }
                }
            } else {
                this.textContent = val;
            }
            this.classList.add('counted');
        } else {
            this.classList.remove('counted');
        }
    }
}

customElements.define('ted-line', Line);
