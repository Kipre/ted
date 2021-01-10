import {Cursel, before, drawCursel} from './cursel.js';
import {Line} from './line.js';
import {Options} from './options.js';
import {Scrollbar} from './scrollbar.js';
import {StateManager} from './state.js';
import {defineActions} from './actions.js';
import {keyToAction} from './keymap.js';
import {config} from './config.js';

export class Ted extends HTMLElement {

    constructor() {
        super();

        this.actions = defineActions(this);

        this.computeCharacterSize();
        this.computeViewport();

        this.state = new StateManager(()=>this.refreshPositions());

        this.position = 0;
        this.hPosition = 0;

        this.prepareDOM();
        this.assignSizes();
        this.render();

        this.assignListeners();
    }

    refreshPositions() {
        this._line = Math.floor(this.state.position / this.charHeight);
        this._delta = this.state.position % this.charHeight;
        this._char = Math.floor(this.state.hPosition / this.charWidth)
        this.render();
    }

    mouseMove(e) {
        if (this.selection) {

            let[x,y] = this.mouseCoordinates(e);
            this.selection.update(...this.mousePosition(x, y));

            /* kink function */
            const kink = (val,span)=>(val < 0 || val > span) * (val - span * (val >= span));

            x = kink(x, this.viewport.width - config.leftMargin - 20);
            y = kink(y, this.viewport.height);

            if (x || y)
                this.scroll({
                    deltaY: y * config.overSelectScrollSpeed,
                    deltaX: x * config.overSelectScrollSpeed
                });
            else
                this.renderCursels();
        }
    }

    mouseDown(e) {
        if (e.defaultPrevented)
            return;
        const [line,char] = this.mousePosition(...this.mouseCoordinates(e));

        this.selection = new Cursel(line,char);

        if (!e.ctrlKey || this.state.cursels.length == 0) {
            this.state.cursels = [this.selection];
        } else {
            // sorted insert
            let inserted = false;
            for (const [i,c] of this.state.cursels.entries()) {
                if (before(c.l, c.c, line, char)) {
                    this.state.cursels.splice(i, 0, this.selection);
                    inserted = true;
                    break;
                }
            }
            if (!inserted)
                this.state.cursels.unshift(this.selection);
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
        this.assignSizes();
        this.render();
    }

    renderCursels() {
        this.relativeDiv.querySelectorAll('.cursor').forEach(e=>e.remove());
        this.relativeDiv.querySelectorAll('.selection').forEach(e=>e.remove());
        this.state.cursels.forEach(c=>drawCursel(this, c));
    }

    input(text) {
        this.state.input(text);
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
        return this.state.normalize(line, char);
    }

    scroll(e) {
        this.position = Math.min(Math.max(0, this.position + (e.deltaY || 0)), this.limit);
        this.hPosition = Math.min(Math.max(0, this.hPosition + (e.deltaX || 0)), Math.max(0, this.maxHorizontalPosition));
        this.render();
    }

    refocus() {
        if (this.currentLine >= this.state.nbLines) {
            this.currentLine = this.state.nbLines - 1;
        }
    }

    render() {
        //                 console.time('render')
        this.refocus();
        this.relativeDiv.style.top = `-${this.currentDelta}px`;
        this.populateLines(config.breakLines);
        this.vScrollbar.update(this.position, this.limit);
        this.renderCursels();
        this.updateLongestLine();
        //                 console.timeEnd('render')
    }

    populateLines(breakLines) {
        this.style.counterSet = `line ${this.currentLine}`;
        for (let i = 0; i < this.nbLines; i++) {
            this.lines[i].set(...this.state.pair(i + this.currentLine, this.currentChar, this.currentChar + this.nbChars));
        }

    }

    get limit() {
        return (this.state.nbLines - 1) * this.charHeight;
    }

    prepareDOM() {
        this.innerHTML = "";

        this.state.style.height = `${config.headerHeight}px`;
        this.state.setWidth(this.viewport.width);
        this.appendChild(this.state);

        this.position = 0;
        this.hPosition = 0;

        this.relativeDiv = document.createElement('div');
        this.relativeDiv.classList.add('relative');
        this.relativeDiv.style.height = `${this.viewport.height + 20}px`;
        this.appendChild(this.relativeDiv);
        /* callbacks */
        this.relativeDiv.onmousedown = (e)=>this.mouseDown(e);
        this.relativeDiv.addEventListener('wheel', e=>this.scroll(e), {
            passive: true
        });

        /* scrollbars */
        this.vScrollbar = new Scrollbar('vertical');
        this.appendChild(this.vScrollbar);
        this.hScrollbar = new Scrollbar('horizontal');
        this.appendChild(this.hScrollbar);
    }

    assignSizes() {
        //         this.state.style.height = `${config.headerHeight}px`;
        this.state.setWidth(this.viewport.width);

        this.relativeDiv.style.height = `${this.viewport.height + 20}px`;

        this.relativeDiv.querySelectorAll('ted-line')?.forEach(l=>l.remove());

        this.lines = [];
        for (let i = 0; i < this.nbLines; i++) {
            const line = new Line(String.fromCodePoint(0));
            line.style.height = `${this.charHeight}px`;
            line.style.width = `${this.charWidth * this.nbChars}px`;
            this.lines.push(line);
            this.relativeDiv.appendChild(line);
        }

        this.vScrollbar.setViewSize(this.viewport.height);
        this.hScrollbar.setViewSize(this.viewport.width);
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
        this.actions[keyToAction(e)](e);
    }

    textFromCursel(curselIndex) {
        let text = "";
        const cursel = this.state.cursels[curselIndex]
        const [sl,sc,el,ec] = cursel.orderedPositions();
        if (cursel.isCursor()) {
            text = "\n" + this.text.lines[cursel.l];
        } else {
            for (let i = sl; i <= el; ++i) {
                const startChar = i == sl ? sc : 0
                const endChar = i == el ? ec : this.state.lines[i].length + 1;
                text += (this.state.lines[i] + '\n').slice(startChar, endChar);
            }
        }
        return text;
    }

    async updateLongestLine() {
        this.maxHorizontalPosition = Math.max(0, (await this.state.longestLine() - this.nbChars + 2) * this.charWidth);
        this.hScrollbar.update(this.hPosition, this.maxHorizontalPosition);
    }

    async fuseCursels() {
        const toRemove = new Set();
        for (let i = 1; i < this.state.cursels.length; i++) {
            for (let j = 0; j < i; j++) {
                if (this.state.cursels[i].fuse(this.state.cursels[j]))
                    toRemove.add(j);
            }
        }
        this.state.cursels = this.state.cursels.filter((_,i)=>!toRemove.has(i));
        this.renderCursels();
    }

    set hPosition(val) {
        this.state.hPosition = val;
        this._char = Math.floor(val / this.charWidth)
    }

    set currentChar(val) {
        this._char = val;
        this.state.hPosition = val * this.charWidth;
    }

    get hPosition() {
        return this.state.hPosition;
    }

    get currentChar() {
        return this._char;
    }

    set position(val) {
        this.state.position = val;
        this._line = Math.floor(this.position / this.charHeight);
        this._delta = this.position % this.charHeight;
    }

    get position() {
        return this.state.position;
    }

    set currentLine(val) {
        this._line = val;
        this._delta = 0;
        this.state.position = val * this.charHeight;
    }

    get currentLine() {
        return this._line;
    }

    get currentDelta() {
        return this._delta;
    }

    assignListeners() {
        window.addEventListener('keydown', e=>this.keyDown(e));

        window.addEventListener('mousemove', e=>this.mouseMove(e));

        window.addEventListener('mouseup', e=>{
            this.selection?.tighten();
            this.selection = null;
            this.fuseCursels();
        }
        );

        window.addEventListener('resize', e=>this.resize());

        window.addEventListener('blur', e=>{
            this.state.cursels = [];
            this.render();
        }
        );

//         window.matchMedia("(prefers-color-scheme: dark)").addListener(e=>this.setTheme(e.matches ? 'dark' : 'light'));
    }
}

customElements.define('ted-editor', Ted);
