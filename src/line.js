const perimeter = 50;
const categories = ['nothing', "property", "variable-builtin",
              "variable", "string", "function-method",
              "variable-parameter", "operator", "keyword",
              "function", 'number', 'comment', 'constant-builtin',
              "string-special", "embedded", "punctuation-special",
              "constructor", "constant", "function-builtin", "escape",
              "keyword-argument", "type"];


export class LineV1 extends HTMLElement {

    constructor(content) {
        super();
        this.content = content;
    }

    get content() {
        return this.textContent;
    }

    set content(val) {
        if (this.parentNode?.highlightModel) {
            this.innerHTML = this.highlight(val);
        } else {
            this.textContent = val;
        }
    }

    highlight(content) {
        const model = this.parentNode.highlightModel;
        let text = [];
        for (let i=0; i < content.length; i++) {
            text.push(content.codePointAt(i) - 9)
        }
        text = [0, 1]
            .concat(Array(perimeter).fill(32-9))
            .concat(text)
            .concat(Array(perimeter).fill(32-9));
        let html = '<span class="nothing">';
        let current_class = 0;
        for (let i=0; i < content.length; i++) {
            const cat = model.predict(tf.tensor(text.slice(i, i + 2*perimeter+1 + 2), [1, 2*perimeter + 1 + 2])).argMax(-1).dataSync()[0];
            if (cat != current_class) {
                html += `</span><span class=${categories[cat]}>${content[i]}`;
                current_class = cat;
            } else {
                html += content[i];
            }
        }
        html += '</span>'
        return html;
    }

    connectedCallback() {
        this.content = this.content;
    }
}

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
