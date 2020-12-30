const perimeter = 50;
const categories = ['nothing', "property", "variable-builtin",
              "variable", "string", "function-method",
              "variable-parameter", "operator", "keyword",
              "function", 'number', 'comment', 'constant-builtin',
              "string-special", "embedded", "punctuation-special",
              "constructor", "constant", "function-builtin", "escape",
              "keyword-argument", "type"];


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
}

customElements.define('ted-line', Line);
