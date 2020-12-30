import {Cursel, before} from './cursel.js';
import {Line} from './line.js';
import {Options} from './options.js';
import {Scrollbar} from './scrollbar.js';

const config = {
    leftMargin: 50,
    brakeLines: false,
    tabSize: 4,
    scrollDistance: 80,
    darkTheme: 'monokai',
    lightTheme: 'breakers',
    overSelectScrollSpeed: 0.5
}

export class Ted extends HTMLElement {

    constructor() {
        super();
        /* state */
        this.docLines = this.textContent.split('\n');

        this.setTheme();

        this.resize();

        window.addEventListener('wheel', e=>this.scroll(e));

        window.addEventListener('keydown', e=>this.keyDown(e));

        this.onmousedown = e=>this.mouseDown(e);

        window.addEventListener('mousemove', e=>this.mouseMove(e));

        window.addEventListener('mouseup', (e)=>{
            this.selection?.tighten();
            this.selection = null;
            this.fuseCursels();
        }
        );

        window.addEventListener('resize', e=>this.resize());

        window.addEventListener('blur', e=>{
            this.cursels = [];
            this.render();
        }
        );

        window.matchMedia("(prefers-color-scheme: dark)").addListener(e=>this.setTheme(e.matches ? 'dark' : 'light'));
    }
    
    /* ui */
    mouseMove(e) {
        if (this.selection) {
            this.selection.update(...this.mousePosition(e));

            let [x, y] = [e.clientX - config.leftMargin, e.clientY];
            
            /* kink function */
            const kink = (val, span) => (val < 0 || val > span) * (val - span*(val >= span));

            x = kink(x, this.viewport.width - config.leftMargin - 20);
            y = kink(y, this.viewport.height);

            this.scroll({deltaY: y*config.overSelectScrollSpeed, 
                         deltaX: x*config.overSelectScrollSpeed});
        }
    }
    
    /* ui */
    mouseDown(e) {
        if (e.defaultPrevented)
            return;
        const [line,char] = this.mousePosition(e);

        this.selection = new Cursel(line,char);

        if (!e.ctrlKey || this.cursels.length == 0)
            this.cursels = [this.selection];
        else {
            // sorted insert
            let inserted = false;
            for (const [i,c] of this.cursels.entries()) {
                if (before(c.l, c.c, line, char)) {
                    this.cursels.splice(i, 0, this.selection);
                    inserted = true;
                    break;
                }
            }
            if (!inserted)
                this.cursels.unshift(this.selection);
        }
        this.renderCursels();
    }
    
    /* ui */
    setTheme(theme) {
        document.head.querySelector('.theme')?.remove();
        const link = document.createElement("link");
        link.classList.add('theme');
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = `themes/${theme == 'dark' ? config.darkTheme : config.lightTheme}.css`;
        document.head.appendChild(link);
    }

    /* ui */
    resize() {
        this.computeCharacterSize();
        this.computeViewport();

        this.position = 0;
        this.hPosition = 0;

        this.prepareDOM();

        this.render();
    }
    
    /* ui */
    renderCursels() {
        this.relativeDiv.querySelectorAll('.cursor').forEach(e=>e.remove());
        this.relativeDiv.querySelectorAll('.selection').forEach(e=>e.remove());
        this.cursels.forEach(c=>{
            if (this.visible(c.l, c.c)) {
                const cursor = document.createElement('div');
                cursor.classList.add('cursor');
                cursor.style.top = `${(c.l - this.currentLine) * this.charHeight}px`;
                cursor.style.left = `${1 + (c.c - this.currentChar) * this.charWidth}px`;
                this.relativeDiv.appendChild(cursor);
            }
            const [sl,sc,el,ec] = c.orderedPositions();
            for (let i = sl; i <= el; ++i) {
                if (this.visible(i)) {
                    const start = i == sl ? Math.max(sc - this.currentChar, 0) : 0;
                    const end = (i == el ? ec : this.docLines[i].length + 1) - this.currentChar;

                    const subSelection = document.createElement('div');
                    subSelection.classList.add('selection');
                    subSelection.style.width = `${(end - start) * this.charWidth}px`;
                    subSelection.style.height = `${this.charHeight}px`;
                    subSelection.style.top = `${(i - this.currentLine) * this.charHeight}px`;
                    subSelection.style.left = `${2 + start * this.charWidth}px`;
                    this.relativeDiv.appendChild(subSelection);
                }
            }
        }
        );
    }

    /* logic */
    input(text) {
        this.cursels.forEach((c)=>{
            const [sl,sc,el,ec] = c.orderedPositions();
            let head, tail;
            for (let i = sl; i <= el; ++i) {
                if (i == el)
                    tail = this.docLines[sl].slice(ec);
                if (i == sl)
                    head = this.docLines[sl].slice(0, sc);
                this.docLines.splice(sl, 1);
            }
            const newLines = (head + text + tail).split('\n');
            this.docLines.splice(sl, 0, ...newLines);
            const last = newLines[newLines.length - 1].length - tail.length;
            c.toCursor(sl + newLines.length - 1, last);
            for (const k of this.cursels) {
                if (k === c)
                    break;
                k.adjust(el, ec, sl - el + newLines.length - 1, last - ec);
            }
        }
        );
        this.render();
        this.fuseCursels();
    }
    
    /* ui */
    visible(line, char) {
        char ??= this.currentChar;
        return this.currentLine <= line && line <= this.currentLine + this.nbLines && this.currentChar <= char && char <= this.currentChar + this.nbChars;
    }

    /* ui */
    mousePosition(e) {
        const char = Math.round(Math.max(0, (e.clientX - 50)) / this.charWidth) + this.currentChar;
        let line = Math.max(0, Math.round(((e.clientY + this.position) / this.charHeight) - 0.4));
        return [line = Math.min(line, this.docLines.length - 1), Math.min(char, this.docLines[line].length)];
    }

    /* ui */
    scroll(e) {
        this.position = Math.min(Math.max(0, this.position + (e.deltaY || 0)), this.limit);
        this.hPosition = Math.min(Math.max(0, this.hPosition + (e.deltaX || 0)), Math.max(0, this.maxHorizontalPosition));
        this.render();
    }

    /* ui */
    refocus() {
        if (this.currentLine >= this.docLines.length) {
            this.currentLine = this.docLines.length - 1;
        }
    }

    /* ui */
    render() {
        this.refocus();

        this.style.counterSet = `line ${this.currentLine}`;
        this.relativeDiv.style.top = `-${this.currentDelta}px`;

        for (let i = 0; i < this.nbLines; i++) {
            this.lines[i].content = this.docLines[i + this.currentLine]?.slice(this.currentChar) ?? String.fromCodePoint(0);
        }

        this.vScrollbar.update(this.position, this.limit);

        this.renderCursels();

        this.updateLongestLine();
    }

    /* ui */
    get limit() {
        return (this.docLines.length - 1) * this.charHeight;
    }

    /* ui */
    prepareDOM() {
        this.innerHTML = "";

        this.style.height = `${this.viewport.height}px`;

        this.relativeDiv = document.createElement('div');
        this.relativeDiv.classList.add('relative');
        this.appendChild(this.relativeDiv);

        this.lines = [];
        for (let i = 0; i < this.nbLines; i++) {
            const line = new Line(String.fromCodePoint(0));
            this.lines.push(line);
            this.relativeDiv.appendChild(line);
        }
        
        this.cursels = [];

        this.vScrollbar = new Scrollbar(this.viewport.height, 'vertical');
        this.appendChild(this.vScrollbar);

        this.hScrollbar = new Scrollbar(this.viewport.width, 'horizontal');
        this.appendChild(this.hScrollbar);
    }

    /* ui */
    computeViewport() {
        this.viewport = {
            height: window.innerHeight,
            width: window.innerWidth
        };
        this.nbLines = Math.ceil(window.innerHeight / this.charHeight);
        this.nbChars = Math.floor((window.innerWidth - config.leftMargin) / this.charWidth);
    }

    /* ui */
    computeCharacterSize() {
        const testSpan = document.createElement('span');
        testSpan.innerHTML = 'a';
        this.appendChild(testSpan);
        const rect = testSpan.getBoundingClientRect();
        this.charHeight = rect.height;
        this.charWidth = rect.width;
        testSpan.remove();
    }

    /* ui */
    keyDown(e) {
        if (e.defaultPrevented)
            return;
        if (e.shiftKey && e.ctrlKey) {
            if (e.key == "P") {
                e.preventDefault();
                const option = this.querySelector('ted-options');
                if (option)
                    option.remove();
                else {
                    this.cursels = [];
                    this.appendChild(new Options(this.viewport));
                }
            } else if (e.key == 'F') {}
        } else if (e.shiftKey) {
            e.preventDefault();
            if (e.key.includes("Arrow")) {
                this.cursels.forEach(c=>{
                    c.moveSelection(e.key.slice(5).toLowerCase(), this.lineContext(c.l));
                }
                );
                this.render();
            } else if (e.key.length == 1) {
                this.input(e.key);
            }
        } else if (e.ctrlKey) {
            e.preventDefault();
            if (e.key == "r") {
                // developement
                document.location.reload(true);
            } else if (e.key == "a") {
                const sel = new Cursel(0,0);
                const len = this.docLines.length - 1;
                sel.update(len, this.docLines[len].length);
                this.cursels = [sel];
                this.renderCursels();
            } else if (e.key == "s") {
                window.showOpenFilePicker();
            } else if (e.key == "c") {
                navigator.clipboard.writeText(this.textFromCursel(this.cursels[0]));
            } else if (e.key == 'v') {
                navigator.clipboard.readText().then(clipText=>{
                    clipText = clipText.replace(/\s\n/g, '\n');
                    this.input(clipText);
                }
                );
            }
        } else {
            e.preventDefault();
            if (e.key.length == 1) {
                this.input(e.key);
            } else if (e.key == 'Backspace') {
                this.cursels.filter(c=>c.isCursor()).forEach(c=>c.moveSelection('left', this.lineContext(c.l)));
                this.input('');
            } else if (e.key == 'Tab') {
                this.input(' '.repeat(config.tabSize));
            } else if (e.key == 'Enter') {
                this.input('\n');
            } else if (e.key.includes("Arrow")) {
                this.cursels.forEach(c=>c.moveCursor(e.key.slice(5).toLowerCase(), this.lineContext(c.l)));
                this.fuseCursels();
            } else if (e.key == "Escape") {
                this.querySelector('ted-options')?.remove();
            } else {
                console.log(e.key);
            }
        }
    }

    /* logic */
    textFromCursel(cursel) {
        let text = "";
        const [sl,sc,el,ec] = cursel.orderedPositions();
        if (cursel.isCursor()) {
            text = "\n" + this.docLines[i];
        } else {
            for (let i = sl; i <= el; ++i) {
                const startChar = i == sl ? sc : 0
                const endChar = i == el ? ec : this.docLines[i].length + 1;
                text += (this.docLines[i] + '\n').slice(startChar, endChar);
            }
        }
        return text;
    }

    /* ui */
    async updateLongestLine() {
        let max = 0;
        for (const line of this.docLines)
            if (line.length > max)
                max = line.length;
        this.maxHorizontalPosition = Math.max(0, (max - this.nbChars + 2) * this.charWidth);
        this.hScrollbar.update(this.hPosition, this.maxHorizontalPosition);
    }

    /* logic */
    lineContext(i) {
        return {
            before: this.docLines[i - 1]?.length,
            here: this.docLines[i]?.length,
            after: this.docLines[i + 1]?.length,
            totalLines: this.docLines.length
        };
    }

    /* logic */
    async fuseCursels() {
        const toRemove = new Set();
        for (let i = 1; i < this.cursels.length; i++) {
            for (let j = 0; j < i; j++) {
                if (this.cursels[i].fuse(this.cursels[j]))
                    toRemove.add(j);
            }
        }
        this.cursels = this.cursels.filter((_,i)=>!toRemove.has(i));
        this.renderCursels();
    }

    set hPosition(val) {
        this._hpos = val;
        this._char = Math.floor(val / this.charWidth)
    }

    set currentChar(val) {
        this._char = val;
        this._hpos = val * this.charWidth;
    }

    get hPosition() {
        return this._hpos;
    }

    get currentChar() {
        return this._char;
    }

    set position(val) {
        this._pos = val;
        this._line = Math.floor(this.position / this.charHeight);
        this._delta = this.position % this.charHeight;
    }

    get position() {
        return this._pos;
    }

    set currentLine(val) {
        this._line = val;
        this._delta = 0;
        this._pos = val * this.charHeight;
    }

    get currentLine() {
        return this._line;
    }

    get currentDelta() {
        return this._delta;
    }
}

customElements.define('ted-editor', Ted);
