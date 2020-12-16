const lineHeight = 21;
const lineWidth = 9.6;

const before = (l1,c1,l2,c2)=>{
    return (l1 < l2) || (l1 == l2 && c1 < c2);
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

        this.appendChild(new Cursel(0,0));
        //         this.interval = window.setInterval(this.blink, 500);

        this.onmousedown = (e)=>{
            const [line,char] = this.mousePosition(e);
            if (!e.ctrlKey)
                this.cursels.forEach((c)=>c.remove());
            this.selection = new Cursel(line,char);
            this.appendChild(this.selection);
        }

        window.addEventListener('mousemove', (e)=>{
            if (this.selection) {
                const [line,char] = this.mousePosition(e);
                this.selection.update(line, char);
            }
        }
        );

        window.addEventListener('mouseup', (e)=>{
            this.selection = null;
            this.fuseCursels();
        }
        );

        document.onkeydown = (e)=>{
            if (!e.ctrlKey) {
                if (e.key.length == 1) {
                    this.input(e.key);
                } else if (e.key == 'Backspace') {
                    this.input('', -1);
                } else if (e.key == 'Enter') {
                    this.input('\n');
                } else {
                    console.log(e.key);
                }
            } else {
                if (e.key == "s") {
                    e.preventDefault();
                    console.log(this.textContent);
                } else if (e.key == 'v') {
                    navigator.clipboard.readText().then(clipText=>this.input(clipText))
                }
            }
        }

        //         window.addEventListener('blur', ()=>{
        //             this.cursels.forEach((c)=>c.remove());
        //             window.clearInterval(this.interval);
        //         }
        //         );

        document.addEventListener('paste', e=>{
            console.log('paste', e);
        }
        )
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

    get cursels() {
        return this.querySelectorAll('ted-cursel');
    }

    async fuseCursels() {
        const cursels = this.querySelectorAll('ted-cursel');
        for (let i = 1; i < cursels.length; i++) {
            for (let j = 0; j < i; j++) {
                cursels[i].fuse(cursels[j]);
            }
        }
    }

    input(key, backspace=false) {
        const [lines,cursels] = [this.lines, this.cursels];
        cursels.forEach((c)=>{
            if (backspace && c.isCursor())
                c.preExpand();
            const [sl,sc,el,ec] = c.orderedPositions();
            let head, tail;
            for (let i = sl; i <= el; ++i) {
                if (i == el)
                    tail = lines[i].content.slice(ec);
                if (i == sl)
                    head = lines[i].content.slice(0, sc);
                else
                    lines[i].remove();
            }
            const newLines = (head + key + tail).split('\n');
            const len = newLines.length - 1;
            if (len == 0) {
                lines[sl].content = newLines[0];
                c.update(sl, sc + key.length, sl, sc + key.length);
                for (const k of cursels) {
                    if (k !== c)
                        k.adjust(el, ec, sc - ec + 1, sl - el);
                }
            } else {
                for (let i = 0; i <= len; ++i) {
                    if (i == 0)
                        lines[sl].content = newLines[i];
                    else
                       this.insertBefore(new Line(newLines[i]), lines[sl + i - 1].nextSibling);
                }
                const last = newLines[newLines.length - 1].length - tail.length;
                c.update(sl + len, last, sl + len, last);
                for (const k of cursels) {
                    if (k !== c) {
                        console.log('adjusting');
                        k.adjust(el, ec, sc - last, sl - el + len);
                    }
                }
            }
        }
        );
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
        const char = Math.round((e.srcElement == this ? e.offsetX : 0) / lineWidth);
        const line = Math.round((e.offsetY / lineHeight) - 0.4);
        return [Math.min(line, lines.length - 1), Math.min(char, lines[line].content.length)];
    }
}

class Cursel extends HTMLElement {

    constructor(line, char) {
        super();

        this.setAttribute('startline', line);
        this.setAttribute('startchar', char);
        this.setAttribute('line', line);
        this.setAttribute('char', char);

        this.render();
    }

    orderedPositions() {
        const [sl,sc,el,ec] = this.positions();
        if (sl > el || (sl == el && sc > ec)) {
            return [el, ec, sl, sc];
        } else {
            return [sl, sc, el, ec];
        }
    }

    positions() {
        return [parseInt(this.getAttribute('startline')), parseInt(this.getAttribute('startchar')), parseInt(this.getAttribute('line')), parseInt(this.getAttribute('char'))];
    }

    update(line, char, sLine, sChar) {
        if (sLine !== undefined)
            this.setAttribute('startline', sLine);
        if (sChar !== undefined)
            this.setAttribute('startchar', sChar);
        this.setAttribute('line', line);
        this.setAttribute('char', char);
        this.render();
    }

    isCursor() {
        let[sl,sc,el,ec] = this.orderedPositions();
        return sl == el && sc == ec;
    }

    render() {
        this.innerHTML = "";
        const [sl,sc,el,ec] = this.orderedPositions();
        this.addCursor(...this.pos);
        for (let i = sl; i <= el; ++i) {
            const startChar = i == sl ? sc : 0
            const endChar = i == el ? ec : this.parentElement.lineLength(i) + 1;
            this.addSubSelection(i, startChar, endChar);
        }
    }

    preExpand() {
        const [l,c] = this.pos;
        if (c != 0) {
            this.update(l, c - 1);
        } else if (l != 0) {
            this.update(l - 1, this.parentElement.lineLength(l - 1));
        }
        const [nl,nc] = this.pos;
        console.log(l, c, nl, nc)
    }

    addCursor(line, char) {
        const subSelection = document.createElement('div');
        subSelection.classList.add('cursor');
        subSelection.style.top = `${line * lineHeight}px`;
        subSelection.style.left = `${51 + char * lineWidth}px`;
        this.appendChild(subSelection);
    }

    addSubSelection(line, start, end) {
        if (start != end) {
            const subSelection = document.createElement('div');
            subSelection.classList.add('selection');
            subSelection.style.width = `${(end - start) * lineWidth}px`;
            subSelection.style.height = `${lineHeight}px`;
            subSelection.style.top = `${line * lineHeight}px`;
            subSelection.style.left = `${52 + start * lineWidth}px`;
            this.appendChild(subSelection);
        }
    }

    get pos() {
        return [parseInt(this.getAttribute('line')), parseInt(this.getAttribute('char'))];
    }

    adjust(line, char, x, y) {
        let[sl,sc,l,c] = this.positions();
        if (sl == line && sc >= char)
            sc += x;
        if (sl >= line)
            sl += y;
        if (l == line && c >= char)
            c += x;
        if (l >= line)
            l += y;

        this.update(l, c, sl, sc);
    }

    inside(line, char) {
        const [sl,sc,el,ec] = this.orderedPositions();
        return (sl < line && line < el) || (line == sl && line != el && sc < char) || (line == el && line != sl && char < ec) || (line == el && line == sl && sc < char && char < ec);
    }

    fuse(other) {
        let[sl,sc,el,ec] = this.orderedPositions();
        const [osl,osc,oel,oec] = other.orderedPositions();
        // if coincidence
        if (sl == osl && sc == osc && el == oel && ec == oec) {
            other.remove();
            return;
        }
        // if overlap
        if (this.inside(osl, osc) || this.inside(oel, oec) || other.inside(sl, sc) || other.inside(el, ec)) {
            [sl,sc] = before(sl, sc, osl, osc) ? [sl, sc] : [osl, osc];
            [el,ec] = !before(el, ec, oel, oec) ? [el, ec] : [oel, oec];
            this.update(el, ec, sl, sc);
            other.remove();
        }
    }
}

customElements.define('ted-cursel', Cursel);
customElements.define('ted-line', Line);
customElements.define('ted-editor', Ted);

navigator.permissions.query({
    name: 'clipboard-read'
});
const editor = document.getElementById('ted');
