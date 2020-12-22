const testSpan = document.createElement('span');
testSpan.innerHTML = 'a';
document.body.appendChild(testSpan);
const rect = testSpan.getBoundingClientRect();
const lineHeight = rect.height;
const lineWidth = rect.width;
testSpan.remove();

const before = (l1,c1,l2,c2)=>{
    return (l1 < l2) || (l1 == l2 && c1 < c2);
}

class Line extends HTMLElement {

    constructor(content) {
        super();
        this.content = content;
    }

    get content() {
        return this.textContent;
    }

    set content(val) {
        this.textContent = val;
    }
}

class Ted extends HTMLElement {

    constructor() {
        super();

        this.selection = null;

        const text = this.textContent;
        this.innerHTML = "";

        for (const line of text.split('\n'))
            this.appendChild(new Line(line));

        this.appendChild(new Cursel(0,0));
        //         this.interval = window.setInterval(this.blink, 500);

        document.onmousedown = (e)=>{
            const [line,char] = this.mousePosition(e);
            const cursels = this.cursels();
            let nextCursel;
            if (!e.ctrlKey)
                cursels.forEach(c=>c.remove());
            else
                // sorted insert
                for (const c of cursels) {
                    if (before(c.l, c.c, line, char)) {
                        nextCursel = c;
                        break;
                    }
                }
            this.selection = new Cursel(line,char);
            //             this.selection.setAttribute("nb", this.cursels().length);
            this.insertBefore(this.selection, nextCursel);
        }

        window.addEventListener('mousemove', e=>{
            if (this.selection) {
                const [line,char] = this.mousePosition(e);
                this.selection.update(line, char);
            }
        }
        );

        window.addEventListener('mouseup', (e)=>{
            this.selection?.tighten();
            this.selection = null;
            this.fuseCursels();
        }
        );

        document.onkeydown = (e)=>{
            if (e.shiftKey) {
                if (e.key.includes("Arrow")) {
                    this.cursels().forEach(c=>{
                        c.moveSelection(e.key.slice(5).toLowerCase());
                    }
                    );
                } else if (e.key.length == 1) {
                    this.input(e.key);
                }
            } else if (e.ctrlKey) {
                if (e.key == "s") {
                    e.preventDefault();
                    console.log(this.textContent);
                } else if (e.key == "c") {
                    this.querySelectorAll('ted-cursel');
                    navigator.clipboard.writeText();
                } else if (e.key == 'v') {
                    console.log()
                    navigator.clipboard.readText().then(clipText=>{
                        console.log(clipText);
                        clipText = clipText.replace(/(\s)\n/g, '\n');
                        for (const line of clipText.split('\n'))
                            console.log(line[line.length - 1])
                        this.input(clipText);
                    }
                    );
                }
            } else {
                if (e.key.length == 1) {
                    this.input(e.key);
                } else if (e.key == 'Backspace') {
                    this.cursors().forEach(c=>c.moveSelection('left', c.update.bind(c)));
                    this.input('');
                } else if (e.key == 'Enter') {
                    this.input('\n');
                } else if (e.key.includes("Arrow")) {
                    this.cursels().forEach(c=>c.moveCursor(e.key.slice(5).toLowerCase()));
                    this.fuseCursels();
                } else {
                    console.log(e.key);
                }
            }
        }

        //         window.addEventListener('blur', ()=>{
        //             this.cursels.forEach((c)=>c.remove());
        //             window.clearInterval(this.interval);
        //         }
        //         );
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

    lines() {
        return this.querySelectorAll('ted-line');
    }

    cursels() {
        return this.querySelectorAll('ted-cursel');
    }

    cursors() {
        const result = [];
        for (const c of this.querySelectorAll('ted-cursel'))
            if (c.isCursor())
                result.push(c);
        return result;
    }

    async fuseCursels() {
        const cursels = this.querySelectorAll('ted-cursel');
        for (let i = 1; i < cursels.length; i++) {
            for (let j = 0; j < i; j++) {
                cursels[i].fuse(cursels[j]);
            }
        }
    }

    input(key) {
        const [lines,cursels] = [this.lines(), this.cursels()];
        cursels.forEach((c)=>{
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
            lines[sl].content = newLines[0];
            for (let i = 1; i <= len; ++i)
                this.insertBefore(new Line(newLines[i]), lines[sl + i - 1]?.nextSibling);
            const last = newLines[newLines.length - 1].length - tail.length;
            c.toCursor(sl + len, last);
            for (const k of cursels) {
                if (k === c)
                    break;
                k.adjust(el, ec, sl - el + len, last - ec);
            }
        }
        );
        this.fuseCursels();
    }

    nbLines() {
        return this.querySelectorAll('ted-line').length;
    }

    lineLength(i) {
        return this.children[i].textContent.length;
    }

    resetBlink() {
        window.clearInterval(this.interval);
        this.interval = window.setInterval(this.blink, 500);
    }

    mousePosition(e) {
        const lines = this.lines();
        const char = Math.round((e.srcElement == this ? e.offsetX : 0) / lineWidth);
        const line = Math.min(Math.max(0, Math.round((e.offsetY / lineHeight) - 0.4)), lines.length - 1);
        return [Math.min(line, lines.length - 1), Math.min(char, lines[line].content.length)];
    }
}

class Cursel extends HTMLElement {

    constructor(line, char) {
        super();

        // cursor position
        this.l = line;
        this.c = char;
        // tail position
        this.tl = line;
        this.tc = char;
        // historic char position
        this.hc = char;

        // add cursor
        this.cursor = document.createElement('div');
        this.cursor.classList.add('cursor');
        this.appendChild(this.cursor);

        this.render();
    }

    isCursor() {
        return this.tl == null || (this.l == this.tl && this.c == this.tc);
    }

    toCursor(line, char) {
        if (line !== null) {
            this.l = line;
            this.c = char;
            this.hc = char;
        }
        this.tl = null;
        this.tc = null;
        this.render();
    }

    toSelection() {
        if (this.tl === null) {
            this.tl = this.l;
            this.tc = this.c;
        }
    }

    render() {
        this.cursor.style.top = `${this.l * lineHeight}px`;
        this.cursor.style.left = `${51 + this.c * lineWidth}px`;

        this.querySelectorAll('.selection').forEach(a=>a.remove());

        if (this.tl !== null && this.parentElement) {
            const [sl,sc,el,ec] = this.orderedPositions();
            const lines = this.parentElement.lines();
            for (let i = sl; i <= el; ++i) {
                const startChar = i == sl ? sc : 0
                const endChar = i == el ? ec : lines[i].textContent.length + 1;
                this.selectionArea(i, startChar, endChar);
            }
        }
    }

    selectionArea(line, start, end) {
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

    update(l, c) {
        this.l = l;
        this.c = c;
        this.hc = c;

        this.render();
    }

    orderedPositions() {
        const [tl,tc] = this.isCursor() ? [this.l, this.c] : [this.tl, this.tc];
        if (this.l > tl || (this.l == tl && this.c > tc)) {
            return [tl, tc, this.l, this.c];
        } else {
            return [this.l, this.c, tl, tc];
        }
    }

    move(way) {
        const lastLine = this.parentElement.nbLines() - 1;
        switch (way) {
        case 'up':
            if (this.l != 0) {
                this.l = this.l - 1;
                this.c = Math.min(this.parentElement.lineLength(this.l), this.hc);
            } else {
                this.l = 0;
                this.c = 0;
            }
            this.render();
            break;
        case 'down':
            if (this.l != lastLine) {
                this.l = this.l + 1;
                this.c = Math.min(this.parentElement.lineLength(this.l), this.hc);
            } else {
                this.l = lastLine
                this.c = this.parentElement.lineLength(lastLine);
            }
            this.render();
            break;
        case 'right':
            const lastChar = this.parentElement.lineLength(this.l);
            if (this.c == lastChar && this.l != lastLine)
                this.update(this.l + 1, 0)
            else if (this.l != lastLine)
                this.update(this.l, this.c + 1);
            break;
        case "left":
            if (this.c == 0 && this.l != 0)
                this.update(this.l - 1, Math.max(this.parentElement.lineLength(this.l - 1), this.c));
            else if (this.c != 0)
                this.update(this.l, this.c - 1);
            break;
        default:
            console.log(`unknown way ${way}`);
        }
        //         console.log(this.l, this.c, this.tl, this.tc, this.hc);
    }

    moveSelection(way) {
        if (this.isCursor())
            this.toSelection();
        this.move(way);
    }

    moveCursor(way) {
        if (!this.isCursor()) {
            if (way == 'left' || way == 'up') {
                const [l,c,_1,_2] = this.orderedPositions();
                this.toCursor(l, c);
            } else if (way == 'right' || way == 'down') {
                const [_1,_2,l,c] = this.orderedPositions();
                this.toCursor(l, c);
            }
        } else
            this.move(way);
    }

    adjust(line, char, deltaLine, deltaChar) {
        if (this.l == line && this.c >= char)
            this.c += deltaChar;
        if (this.l >= line)
            this.l += deltaLine;
        this.render();
    }

    inside(line, char) {
        const [sl,sc,el,ec] = this.orderedPositions();
        return (sl < line && line < el) || (line == sl && line != el && sc < char) || (line == el && line != sl && char < ec) || (line == el && line == sl && sc < char && char < ec);
    }

    tighten() {
        if (this.l == this.tl && this.c == this.tc) {
            this.tc = null;
            this.tl = null;
        }
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
            console.log('ovelap');
            [sl,sc] = before(sl, sc, osl, osc) ? [sl, sc] : [osl, osc];
            [el,ec] = !before(el, ec, oel, oec) ? [el, ec] : [oel, oec];
            this.tl = sl;
            this.tc = sc;
            this.l = el;
            this.c = ec;
            this.render();
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

// if ('serviceWorker'in navigator) {
//     window.addEventListener('load', function() {
//         navigator.serviceWorker.register('/sw.js').then(function(registration) {
//             // Registration was successful
//             console.log('ServiceWorker registration successful with scope: ', registration.scope);
//         }, function(err) {
//             // registration failed :(
//             console.log('ServiceWorker registration failed: ', err);
//         });
//     });
// }
