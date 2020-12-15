const lineHeight = 21;
const lineWidth = 9.6;

class Cursor extends HTMLElement {

    static get observedAttributes() {
        return ['line', 'char'];
    }

    constructor(line, char) {
        super();

        this.update(line, char);
    }

    update(line, char) {
        this.setAttribute('line', line);
        this.setAttribute('char', char);
        this.hidden = false;
    }

    get line() {
        return parseInt(this.getAttribute('line'));
    }

    get char() {
        return parseInt(this.getAttribute('char'));
    }

    set line(val) {
        return this.setAttribute('line', val);
    }
    
    set char(val) {
        return this.setAttribute('char', val);
    }

    get pos() {
        return [parseInt(this.getAttribute('line')), parseInt(this.getAttribute('char'))];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name == 'line') {
            this.style.top = `${newValue * lineHeight}px`
        } else if (name == 'char') {
            this.style.left = `${51 + newValue * lineWidth}px`;
        }
    }

    matches(other) {
        return this.getAttribute('line') == other.getAttribute('line') && this.getAttribute('char') == other.getAttribute('char');
    }

    isToTheLeft(other) {
        return this.getAttribute('line') == other.getAttribute('line') && this.getAttribute('char') < other.getAttribute('char');
    }
}

class Line extends HTMLElement {

    constructor(content) {
        super();

        this.innerHTML = `${content}`;
    }

    get content() {
        return this.textContent;
    }

    set content(val) {
        this.innerHTML = val;
    }

    insert(i, key, decalage = 0) {
        const oldText = this.content;
        this.content = oldText.slice(0, i) + key + oldText.slice(i + decalage);
    }
}

class Ted extends HTMLElement {

    constructor() {
        super();

        const text = this.textContent
        this.textContent = "";

        for (const line of text.split('\n')) {
            this.appendChild(new Line(line));
        }

        this.appendChild(new Cursor(0,0));
        this.interval = window.setInterval(this.blink, 500);

        document.body.onclick = (e)=>{
            // click: cursor move
            const lines = this.lines;
            let char = Math.round(e.offsetX / lineWidth);
            let line = Math.round((e.offsetY / lineHeight) - 0.4);
            line = Math.min(line, lines.length - 1);
            char = Math.min(char, lines[line].content.length);

            if (e.ctrlKey) {
                this.appendChild(new Cursor(line,char));
                this.removeDuplicateCursors();
            } else {
                const [cursor,...garbage] = this.cursors;
                cursor.update(line, char);
                garbage.forEach((c)=>c.remove());
            }
        }

        document.onkeydown = (e)=>{
            if (e.key.length == 1) {
                this.input(e.key);
            } else if (e.key == 'Backspace') {
                this.backspace();
            } else if (e.key == 'Enter') {
                this.lineBreak();
            } else {
                console.log(e.key);
            }
        }
    }

    get blink() {
        return ()=>{
            const [first,...others] = this.cursors;
            first.hidden ^= true;
            others.forEach((c)=>{
                c.hidden = first.hidden;
            }
            );
        }
    }

    get lines() {
        return this.querySelectorAll('ted-line');
    }

    get cursors() {
        return this.querySelectorAll('ted-cursor');
    }

    async removeDuplicateCursors() {
        const cursors = this.querySelectorAll('ted-cursor');
        for (let i = 1; i < cursors.length; i++) {
            for (let j = 0; j < i; j++) {
                if (cursors[i].matches(cursors[j])) {
                    cursors[j].remove();
                }
            }
        }
    }

    input(key) {
        const lines = this.lines;
        this.cursors.forEach((c)=>{
            lines[c.line].insert(c.char, key);
            c.char += 1;
        });
    }

    backspace() {
        const [lines, cursors] = [this.lines, this.cursors];
        cursors.forEach((c)=>{
            if (c.char == 0 && c.line != 0) {
                // linebreak
                c.line -= 1;
                c.char = lines[c.line].content.length;
                lines[c.line].content += lines[c.line + 1].content;
                lines[c.line + 1].remove();
            } else if (c.char != 0) {
                // normal situation
                lines[c.line].insert(c.char-1, "", 1);
                c.char -= 1;
                // TODO: find a better method
                cursors.forEach((k) => {
                    if (c.isToTheLeft(k)) {
                        k.char -= 1;
                    }
                });
            }
            c.hidden = false;
        })
        this.removeDuplicateCursors();
    }

    lineBreak() {
        const [lines, cursors] = [this.lines, this.cursors];
        cursors.forEach((c)=>{
            const lineContent = lines[c.line].content;
            lines[c.line].content = lineContent.slice(0, c.char);
            c.line += 1;
            this.insertBefore(new Line(lineContent.slice(c.char)), lines[c.line]);
            c.char = 0;
            c.hidden = false;
        })
    }

    resetBlink() {
        window.clearInterval(this.interval);
        this.interval = window.setInterval(this.blink, 500);
    }
}

customElements.define('ted-cursor', Cursor);
customElements.define('ted-line', Line);
customElements.define('ted-editor', Ted);

const editor = document.getElementById('ted');
