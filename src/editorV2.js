import {Cursel, before} from './cursel.js';
import {Line} from './line.js';
import {Controls} from './controls.js';
import {Scrollbar} from './scrollbar.js';

const config = {
    leftMargin: 50,
    brakeLines: false
}

export class Ted extends HTMLElement {

    constructor() {
        super();
        this.doc = this.textContent;
        this.docLines = this.doc.split('\n');
        this.innerHTML = "";

        this.currentLine = 0;
        this.currentDelta = 0;
        this.absPosition = 0;

        this.computeCharacterSize();
        this.computeViewport();
        this.prepareDOM();

        this.render();

        window.addEventListener('wheel', e=>{
            this.scroll(e.deltaY)
        }
        );

        this.onmousedown = e=>{
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

        window.addEventListener('mousemove', e=>{
            if (this.selection) {
                const [line,char] = this.mousePosition(e);
                this.selection.update(line, char);
            }
            this.renderCursels();
        }
        );

        window.addEventListener('mouseup', (e)=>{
            this.selection?.tighten();
            this.selection = null;
            this.fuseCursels();
        }
        );
    }

    renderCursels() {
        this.relativeDiv.querySelectorAll('.cursor').forEach(e=>e.remove());
        this.relativeDiv.querySelectorAll('.selection').forEach(e=>e.remove());
        this.cursels.forEach(c=>{
            if (this.visible(c.l)) {
                const cursor = document.createElement('div');
                cursor.classList.add('cursor');
                cursor.style.top = `${(c.l - this.currentLine) * this.charHeight}px`;
                cursor.style.left = `${1 + c.c * this.charWidth}px`;
                this.relativeDiv.appendChild(cursor);
            }
            const [sl,sc,el,ec] = c.orderedPositions();
            for (let i = sl; i <= el; ++i) {
                if (this.visible(i)) {
                    const start = i == sl ? sc : 0
                    const end = i == el ? ec : this.docLines[i].length + 1;

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

    visible(line) {
        return this.currentLine <= line && line <= this.currentLine + this.nbLines
    }

    mousePosition(e) {
        const char = Math.round((e.srcElement == this ? e.offsetX : 0) / this.charWidth);
        let line = Math.max(0, Math.round(((e.offsetY + this.absPosition) / this.charHeight) - 0.4));
        return [line = Math.min(line, this.docLines.length - 1), Math.min(char, this.docLines[line].length)];
    }

    scroll(deltaY) {
        this.absPosition = Math.min(Math.max(0, this.absPosition + deltaY), this.limit);

        this.scrollbar.update(this.absPosition, this.limit);

        this.currentLine = Math.floor(this.absPosition / this.charHeight);
        this.currentDelta = this.absPosition % this.charHeight;
        this.render();
    }

    render() {
        this.style.counterSet = `line ${this.currentLine}`;
        this.relativeDiv.style.top = `-${this.currentDelta}px`;

        for (let i = 0; i < this.nbLines; i++) {
            this.lines[i].content = this.docLines[i + this.currentLine] ?? String.fromCodePoint(0);
        }

        this.renderCursels()
    }

    prepareDOM() {

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

        this.limit = (this.docLines.length - 1) * this.charHeight;
        this.scrollbar = new Scrollbar(this.nbLines * this.charHeight,this.limit,this.charWidth * this.nbChar)
        this.appendChild(this.scrollbar);
    }

    computeViewport() {
        const rect = this.parentNode.getBoundingClientRect();
        this.nbLines = Math.ceil(rect.height / this.charHeight);
        this.nbChar = Math.floor((rect.width - config.leftMargin) / this.charWidth);
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

    async fuseCursels() {
        const toRemove = new Set();
        for (let i = 1; i < this.cursels.length; i++) {
            for (let j = 0; j < i; j++) {
                if (this.cursels[i].fuse(this.cursels[j]))
                    toRemove.add(j);
            }
        }
        this.cursels = this.cursels.filter((_, i) => !toRemove.has(i));
        this.renderCursels();
    }
}

customElements.define('ted-editor', Ted);
