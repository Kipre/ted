const lineHeight = 21;
const lineWidth = 9.6;

class Cursor extends HTMLElement {

    static get observedAttributes() {
        return ['line', 'char'];
    }

    constructor(line, char) {
        super();

        this.setAttribute('line', line);
        this.setAttribute('char', char);
    }

    get line() {
        return parseInt(this.getAttribute('line'));
    }

    get char() {
        return parseInt(this.getAttribute('char'));
    }

    set char(val) {
        this.setAttribute('char', val);
    }

    set line(val) {
        this.setAttribute('char', val);
    }

    connectedCallback() {}

    attributeChangedCallback(name, oldValue, newValue) {
        if (name == 'line') {
            this.style.top = `${newValue * lineHeight}px`
        } else if (name == 'char') {
            this.style.left = `${51 + newValue * lineWidth}px`;
        }
    }
}

class Line extends HTMLElement {

    static get observedAttributes() {
        return ['number'];
    }

    constructor(number, content) {
        super();

        this.lineContent = content;

        this.innerHTML = `
            <span class="number"></span>
            <div class="line">${content} </div>`;

        this.line = this.querySelector('.line');
        this.setAttribute('number', number);

        this.onclick = (e)=>{
            e.preventDefault();
            const obsChar = Math.round(e.offsetX / lineWidth);
            const char = obsChar > this.content.length ? this.content.length : obsChar;
            const line = this.getAttribute('number');
            if (!e.ctrlKey) {
                const [cursor,...garbage] = this.parentElement.cursors;
                cursor.setAttribute('char', char);
                cursor.setAttribute('line', line);
                cursor.hidden = false;
                garbage.forEach((c)=>{
                    c.remove();
                }
                );
            } else {
                for (const c of this.parentElement.cursors) {
                    if (c.getAttribute("line") == line && c.getAttribute('char') == char) {
                        return;
                    }
                }
                this.parentElement.appendChild(new Cursor(line,char));
            }
        }
    }

    get content() {
        return this.line.innerText.slice(0, -1);
    }

    set content(string) {
        this.line.innerText = string + " ";
    }

    insert(i, character) {
        this.content = this.line.innerText.slice(0, i) + character + this.line.innerText.slice(i);
    }

    backspace(i) {
        this.content = this.line.innerText.slice(0, i - 1) + this.line.innerText.slice(i);
    }

    connectedCallback() {}

    attributeChangedCallback(name, oldValue, newValue) {
        if (name == 'number') {
            this.querySelector('span').textContent = `${parseInt(newValue) + 1}`;
        }
    }
}

class Ted extends HTMLElement {

    static get observedAttributes() {
        return ['l', 'c'];
    }

    constructor() {
        super();

        const initText = this.textContent;
        this.textContent = "";

        this.appendChild(new Cursor(0,0));
        window.setInterval(this.blink, 500);

        this.lines = [];

        for (const [i,line] of initText.split('\n').entries()) {
            const newLine = new Line(i,line)
            this.appendChild(newLine);
            this.lines.push(newLine);
        }

        document.onkeydown = (e)=>{
            if (e.key.length == 1) {
                this.input(e.key);
            } else if (e.key == 'Backspace') {
                this.backspace();
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
            )
        }
    }

    get cursors() {
        return this.querySelectorAll('ted-cursor')
    }

    input(key) {
        this.cursors.forEach((c)=>{
            this.lines[c.line].insert(c.char, key);
            c.char += 1;
        }
        )
    }

    backspace() {
        this.cursors.forEach((c)=>{
            if (c.char == 0 && c.line != 0) {
                c.char = this.lines[c.line].content.length;
                c.line -= 1;
                this.lines[c.line].content += this.lines[c.line + 1].content
                this.removeLine(c.line);
            } else if (c.char != 0) {
                this.lines[c.line].backspace(c.char);
                c.char -= 1;
            }
        }
        )
    }

    removeLine(i) {
        this.lines[i].remove();
        this.lines = [...this.lines.slice(0, i- 1), ...this.lines.slice(i)];
        this.lines.forEach((l,i)=>{
            l.setAttribute('number', i)
        }
        );
    }

    connectedCallback() {}

    disconnectedCallback() {}

    adoptedCallback() {}

    attributeChangedCallback(name, oldValue, newValue) {}
}

customElements.define('ted-cursor', Cursor);
customElements.define('ted-line', Line);
customElements.define('ted-editor', Ted);

const editor = document.getElementById('ted');
