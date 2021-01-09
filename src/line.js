import {config} from './config.js';

const perimeter = 40;
const oper = 10;
const categories = ['nothing', "property", "variable-builtin", "variable", "string", "function-method", "variable-parameter", "operator", "keyword", "function", 'number', 'comment', 'constant-builtin', "string-special", "embedded", "punctuation-special", "constructor", "constant", "function-builtin", "escape", "keyword-argument", "type"];

const space = ' '.charCodeAt(0) - 9;

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

    set(val, cats) {
        if (cats) {
            let result = '';
            let currentCategory = 0;
            for (let i = 0; i < val.length; i++) {
                if (cats[i] == currentCategory) {
                    result += val[i];
                } else {
                    result += `</span><span class='${categories[cats[i]]}'>${val[i]}`;
                    currentCategory = cats[i];
                }
            }
            this.innerHTML = result;
            this.classList.add('counted');
        } else if (val !== String.fromCodePoint(0)) {
            this.textContent = val;
            this.classList.add('counted');
        } else {
            this.innerHTML = '';
            this.classList.remove('counted');
        }
    }
}

customElements.define('ted-line', Line);
