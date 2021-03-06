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

    appendChildSpan(text, cat) {
        const domSpan = document.createElement('span');
        domSpan.textContent = text;
        domSpan.classList.add(categories[cat]);
        this.appendChild(domSpan);
    }

    set(val, cats) {
        this.innerHTML = '';
        if (val !== String.fromCodePoint(0)) {
            if (cats) {
                let curCategory = 0
                  , span = '';
                for (let i = 0; i < val.length; i++) {
                    if (curCategory === cats[i]) {
                        span += val[i];
                    } else {
                        this.appendChildSpan(span, curCategory);
                        span = val[i];
                        curCategory = cats[i];
                    }
                }
                this.appendChildSpan(span, curCategory);
            } else {
                this.textContent = val;
            }
            this.classList.add('counted');
        } else {
            this.classList.remove('counted');
        }
    }

    set1(val, cats) {
        this.innerHTML = '';
        if (val !== String.fromCodePoint(0)) {
            for (let i = 0; i < val.length; i++) {
                const span = document.createElement('span');
                if (cats)
                span.classList.add(categories[cats[i]]);
                span.innerText = val[i];
                this.appendChild(span);
            }
            this.classList.add('counted');
        } else
            this.classList.remove('counted');
    }
}

customElements.define('ted-line', Line);
