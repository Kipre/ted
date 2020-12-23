import {StringStream} from './stringstream.js';

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
        let text = '';
        let parserState = this.previousSibling?.parserState || this.parentNode.mode.startState(0);
        const stream = new StringStream(this.content,this.parentNode.options.tabSize);
        while (!stream.eol()) {
            const currentClass = this.parentNode.mode.token(stream, parserState);
            text += currentClass ? `<span class="cm-${currentClass}">${stream.current()}</span>` : stream.current();
            stream.start = stream.pos;
        }
        this.parserState = parserState;
        this.innerHTML = text;
    }

    connectedCallback() {
        this.highlight();
    }
}

customElements.define('ted-line', Line);
