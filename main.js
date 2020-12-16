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
            // DEBUG code
            this.textContent = `${this.char}`;
        }
        //             console.log(name, oldValue, newValue);
    }

    matches(other) {
        return this.line == other.line && this.char == other.char;
    }

    isToTheLeft(other) {
        return this.line == other.line && this.char < other.char;
    }

    higher(other) {
        return this.line < other.line;
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

    insert(i, key, decalage=0) {
        const oldText = this.content;
        this.content = oldText.slice(0, i) + key + oldText.slice(i + decalage);
    }
}

class Ted extends HTMLElement {

    constructor() {
        super();

        this.selection = null;

        const text = this.textContent
        this.textContent = "";

        for (const line of text.split('\n')) {
            this.appendChild(new Line(line));
        }

        this.appendChild(new Cursor(0,0));
        this.interval = window.setInterval(this.blink, 500);

//         this.onclick = (e)=>{
//             // click: cursor move
//             const [line,char] = mousePosition(e);
//             if (e.ctrlKey) {
//                 this.appendChild(new Cursor(line,char));
//                 this.removeDuplicateCursors();
//             } else {
//                 this.cursors.forEach((c)=>c.remove());
//                 this.appendChild(new Cursor(line,char));
//             }
//         }

        this.onmousedown = (e)=>{
            const [line,char] = this.mousePosition(e);
            this.selections.forEach((s)=>s.remove());
            this.selection = new Selection(line, char);
            this.appendChild(this.selection);
        }

        this.onmousemove = (e)=>{
            if (this.selection) {
                const [line,char] = this.mousePosition(e);
                this.selection.update(line, char);
            }
        }

        this.onmouseup = (e)=>{
            this.selection = null;
        }

        document.onkeydown = (e)=>{
            if (!e.ctrlKey) {
                if (e.key.length == 1) {
                    this.input(e.key);
                } else if (e.key == 'Backspace') {
                    this.backspace();
                } else if (e.key == 'Enter') {
                    this.lineBreak();
                } else {
                    console.log(e.key);
                }
            } else {
                if (e.key == "s") {
                    e.preventDefault();
                    console.log(this.textContent);
                }
            }
        }

        window.addEventListener('blur', ()=>{
            this.cursors.forEach((c)=>c.remove());
            window.clearInterval(this.interval);
        }
        );
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

    get selections() {
        return this.querySelectorAll('ted-selection');
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
        }
        );
    }

    backspace() {
        const [lines,cursors] = [this.lines, this.cursors];
        cursors.forEach((c)=>{
            if (c.char == 0 && c.line != 0) {
                // linebreak
                c.line -= 1;
                c.char = lines[c.line].content.length;
                lines[c.line].content += lines[c.line + 1].content;
                lines[c.line + 1].remove();
                cursors.forEach((k)=>{
                    if (k.line == c.line + 1) {
                        k.char += c.char;
                    }
                    if (c.higher(k)) {
                        k.line -= 1;
                    }
                }
                );
            } else if (c.char != 0) {
                // normal situation
                lines[c.line].insert(c.char - 1, "", 1);
                c.char -= 1;
                cursors.forEach((k)=>{
                    if (c.isToTheLeft(k)) {
                        k.char -= 1;
                    }
                }
                );
            }
            c.hidden = false;
        }
        )
        this.removeDuplicateCursors();
    }

    lineBreak() {
        const [lines,cursors] = [this.lines, this.cursors];
        cursors.forEach((c)=>{
            const lineContent = lines[c.line].content;
            lines[c.line].content = lineContent.slice(0, c.char);
            c.line += 1;
            this.insertBefore(new Line(lineContent.slice(c.char)), lines[c.line]);
            c.char = 0;
            c.hidden = false;
        }
        )
    }

    lineLength(i) {
        return this.children[i].textContent.length;
    }

    resetBlink() {
        window.clearInterval(this.interval);
        this.interval = window.setInterval(this.blink, 500);
    }

    mousePosition(e) {
        const lines = this.lines;
        let char = Math.round(e.offsetX / lineWidth);
        let line = Math.round((e.offsetY / lineHeight) - 0.4);
        line = Math.min(line, lines.length - 1);
        char = Math.min(char, lines[line].content.length);
        return [line, char];
    }
}

class Selection extends HTMLElement {
    
    constructor(line, char) {
        super();

        this.setAttribute('startline', line);
        this.setAttribute('endline', line);
        this.setAttribute('startchar', char);
        this.setAttribute('endchar', char);
    }

    orderedPositions() {
        const [sl, sc, el, ec] = [parseInt(this.getAttribute('startline')),
                                  parseInt(this.getAttribute('startchar')),
                                  parseInt(this.getAttribute('endline')), 
                                  parseInt(this.getAttribute('endchar'))];
        if (sl > el || (sl == el && sc > ec)) {
            return [el, ec, sl, sc];
        } else {
            return [sl, sc, el, ec];
        }
    }

    update(line, char) {
        this.setAttribute('endline', line);
        this.setAttribute('endchar', char);

        this.render();
    }

    render() {
        this.innerHTML = "";
        const [sl, sc, el, ec] = this.orderedPositions();
        for (let i=sl; i <= el; ++i) {
            const startChar = i == sl ? sc : 0
            const endChar = i == el ? ec : this.parentElement.lineLength(i) + 1;
            const subSelection = document.createElement('div');
            subSelection.classList.add('selection');
            subSelection.style.width = `${(endChar - startChar) * lineWidth}px`;
            subSelection.style.height = `${lineHeight}px`;
            subSelection.style.top = `${i * lineHeight}px`;
            subSelection.style.left = `${52 + startChar * lineWidth}px`;
            this.appendChild(subSelection);
        }
    }
}

customElements.define('ted-cursor', Cursor);
customElements.define('ted-selection', Selection);
customElements.define('ted-line', Line);
customElements.define('ted-editor', Ted);

const editor = document.getElementById('ted');
