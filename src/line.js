import {parser} from '../lezer/lezer-javascript.js';

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
        if (this.parentNode)
            this.highlight();
    }

    highlight() {
//         const parseContext = this.parentNode?.context || parser.startParse(text);
//         for (const line of text.split('\n')) {
//             parseContext.advance(line.length);
//             console.log(parseContext.forceFinish());
//         }
    }
}

customElements.define('ted-line', Line);
