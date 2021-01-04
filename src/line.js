import {config} from './config.js';

const perimeter = 40;
const oper = 10;
const categories = ['nothing', "property", "variable-builtin",
              "variable", "string", "function-method",
              "variable-parameter", "operator", "keyword",
              "function", 'number', 'comment', 'constant-builtin',
              "string-special", "embedded", "punctuation-special",
              "constructor", "constant", "function-builtin", "escape",
              "keyword-argument", "type"];

const space = ' '.charCodeAt(0) - 9;


export class Line extends HTMLElement {

    constructor(content) {
        super();
        this.content = content;

    }

    get content() {
        return this.textContent;
    }

//     setLine(line, count) {
//         this.textContent = line;
//         count ? this.classList.add('counted') : this.classList.remove('counted');
//     }

    set content(val) {
        if (val?.codePointAt(0) == 0) {
            this.innerHTML = '';
            this.classList.remove('counted');
        } else {
            this.textContent = val;
            this.classList.add('counted');
            if (model && config.highlight)
                this.highlight(val);
        }
    }

    async highlight(line) {
        const chunk = 2*oper + 1;
        const inChunk = 2*perimeter + 1;
        let letters = Array.from(line).map(c=>c.charCodeAt(0) - 9);
        const nbChunks = Math.ceil(letters.length / chunk) || 1
        letters = letters.concat(Array(nbChunks * chunk - letters.length).fill(space));
        letters = Array(perimeter - oper).fill(space).concat(letters).concat(Array(perimeter - oper).fill(space));
        const batch = []
        for (let i=0; i < nbChunks; i++) {
            batch.push(letters.slice(i*inChunk, (i + 1)*inChunk));
        }
        const classes = tf.argMax(model.predict(tf.tensor(batch, [nbChunks, inChunk], 'int32')), -1).dataSync();
        this.innerHTML = Array.from(line).map((c, i)=>{
            return `<span class="${categories[classes[i]]}">${c}</span>`
        }).join('');
    }
}

customElements.define('ted-line', Line);
