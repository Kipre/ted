import {Cursel, before, drawCursel} from './cursel.js';
import {Line} from './line.js';
import {Options} from './options.js';
import {Scrollbar} from './scrollbar.js';
import {TextManager} from './editor.js';
import {defineActions} from './actions.js';
import {keyToAction} from './keymap.js';
import {config} from './config.js';

export class Ted extends HTMLElement {

    constructor() {
        super();

        this.text = new TextManager(this.textContent, ()=>this.render());
        this.actions = defineActions(this);

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

    mouseMove(e) {
        if (this.selection) {

            let[x,y] = this.mouseCoordinates(e);
            this.selection.update(...this.mousePosition(x, y));

            /* kink function */
            const kink = (val,span)=>(val < 0 || val > span) * (val - span * (val >= span));

            x = kink(x, this.viewport.width - config.leftMargin - 20);
            y = kink(y, this.viewport.height);

            this.scroll({
                deltaY: y * config.overSelectScrollSpeed,
                deltaX: x * config.overSelectScrollSpeed
            });
        }
    }

    mouseDown(e) {
        if (e.defaultPrevented)
            return;
        const [line,char] = this.mousePosition(...this.mouseCoordinates(e));

        this.selection = new Cursel(line,char);

        if (!e.ctrlKey || this.cursels.length == 0) {
            this.cursels = [this.selection];
        } else {
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

    setTheme(theme) {
        document.head.querySelector('.theme')?.remove();
        const link = document.createElement("link");
        link.classList.add('theme');
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = `themes/${theme == 'dark' ? config.darkTheme : config.lightTheme}.css`;
        document.head.appendChild(link);
    }

    resize() {
        this.computeCharacterSize();
        this.computeViewport();

        this.position = 0;
        this.hPosition = 0;

        this.prepareDOM();

        this.render();
    }

    renderCursels() {
        this.relativeDiv.querySelectorAll('.cursor').forEach(e=>e.remove());
        this.relativeDiv.querySelectorAll('.selection').forEach(e=>e.remove());
        this.cursels.forEach(c=>drawCursel(this, c));
    }

    input(text) {
        this.cursels.forEach((c)=>{
            const [sl,sc,el,ec] = c.orderedPositions();
            const head = this.text.lines[sl].slice(0, sc);
            const tail = this.text.lines[el].slice(ec);
            const newLines = (head + text + tail).split('\n');
            this.text.splice(sl, el - sl + 1, ...newLines);
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

    visible(line, char) {
        char ??= this.currentChar;
        return this.currentLine <= line && line <= this.currentLine + this.nbLines && this.currentChar <= char && char <= this.currentChar + this.nbChars;
    }

    mouseCoordinates(e) {
        return [e.clientX - config.leftMargin, e.clientY - config.headerHeight];
    }

    mousePosition(x, y) {
        const char = Math.round(Math.max(0, x) / this.charWidth) + this.currentChar;
        const line = Math.round(((y + this.position) / this.charHeight) - 0.4);
        return this.text.normalize(line, char);
    }

    scroll(e) {
        this.position = Math.min(Math.max(0, this.position + (e.deltaY || 0)), this.limit);
        this.hPosition = Math.min(Math.max(0, this.hPosition + (e.deltaX || 0)), Math.max(0, this.maxHorizontalPosition));
        this.render();
    }

    refocus() {
        if (this.currentLine >= this.text.nbLines) {
            this.currentLine = this.text.nbLines - 1;
        }
    }

    render() {
        this.refocus();

        this.style.counterSet = `line ${this.currentLine}`;
        this.relativeDiv.style.top = `-${this.currentDelta}px`;

        for (let i = 0; i < this.nbLines; i++) {
            this.lines[i].content = this.text.lines[i + this.currentLine]?.slice(this.currentChar) ?? String.fromCodePoint(0);
        }

        this.vScrollbar.update(this.position, this.limit);

        this.renderCursels();

        this.updateLongestLine();
    }

    get limit() {
        return (this.text.nbLines - 1) * this.charHeight;
    }

    prepareDOM() {
        this.innerHTML = "";

//         this.style.height = `${this.viewport.height}px`;

        this.text.style.height = `${config.headerHeight}px`;
        this.text.style.width = `${this.viewport.width}px`;
        this.appendChild(this.text);

        this.relativeDiv = document.createElement('div');
        this.relativeDiv.classList.add('relative');
        this.relativeDiv.style.height = `${this.viewport.height + 20}px`;
        this.appendChild(this.relativeDiv);

        this.lines = [];
        for (let i = 0; i < this.nbLines; i++) {
            const line = new Line(String.fromCodePoint(0));
            this.lines.push(line);
            this.relativeDiv.appendChild(line);
        }

        this.cursels = [];

        this.vScrollbar = new Scrollbar(this.viewport.height,'vertical');
        this.appendChild(this.vScrollbar);

        this.hScrollbar = new Scrollbar(this.viewport.width,'horizontal');
        this.appendChild(this.hScrollbar);
    }

    computeViewport() {
        this.viewport = {
            height: window.innerHeight - config.headerHeight,
            width: window.innerWidth
        };
        this.nbLines = Math.ceil(window.innerHeight / this.charHeight);
        this.nbChars = Math.floor((window.innerWidth - config.leftMargin) / this.charWidth);
    }

    computeCharacterSize() {
        const testSpan = document.createElement('span');
        testSpan.innerHTML = 'a';
        this.appendChild(testSpan);
        const rect = testSpan.getBoundingClientRect();
        this.charHeight = rect.height;
        this.charWidth = rect.width;
        testSpan.remove();
    }

    keyDown(e) {
        if (e.defaultPrevented)
            return;
        console.log(keyToAction(e));
        this.actions[keyToAction(e)](e);
    }

    textFromCursel(curselIndex) {
        let text = "";
        const cursel = this.cursels[curselIndex]
        const [sl,sc,el,ec] = cursel.orderedPositions();
        if (cursel.isCursor()) {
            text = "\n" + this.text.lines[cursel.l];
        } else {
            for (let i = sl; i <= el; ++i) {
                const startChar = i == sl ? sc : 0
                const endChar = i == el ? ec : this.text.lines[i].length + 1;
                text += (this.text.lines[i] + '\n').slice(startChar, endChar);
            }
        }
        return text;
    }

    async updateLongestLine() {
        this.maxHorizontalPosition = Math.max(0, (await this.text.longestLine() - this.nbChars + 2) * this.charWidth);
        this.hScrollbar.update(this.hPosition, this.maxHorizontalPosition);
    }

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
