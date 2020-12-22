import {Cursel, before} from './cursel.mjs';
import {Line} from './line.mjs';
import {Controls} from './controls.mjs';

export class Ted extends HTMLElement {

    constructor(lineWidth, lineHeight) {
        super();

        this.computeCharacterSize();

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

        document.addEventListener('keydown', (e)=>{
            if (e.defaultPrevented)
                return;
            e.preventDefault();
            if (e.shiftKey && e.ctrlKey) {
                if (e.key == "P") {
                    this.querySelector('ted-controls')?.remove();
                    this.appendChild(new Controls());
                }
            } else if (e.shiftKey) {
                if (e.key.includes("Arrow")) {
                    this.cursels().forEach(c=>{
                        c.moveSelection(e.key.slice(5).toLowerCase());
                    }
                    );
                } else if (e.key.length == 1) {
                    this.input(e.key);
                }
            } else if (e.ctrlKey) {
                if (e.key == "r") {
                    // developement
                    document.location.reload(true);
                } else if (e.key == "s") {
                    window.showOpenFilePicker();
                } else if (e.key == "c") {
                    const firstSelection = this.querySelector('ted-cursel');
                    navigator.clipboard.writeText(this.textFromSelection(firstSelection));
                } else if (e.key == 'v') {
                    navigator.clipboard.readText().then(clipText=>{
                        clipText = clipText.replace(/\s\n/g, '\n');
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
                } else if (e.key == "Escape") {
                    this.querySelector('ted-controls')?.remove();
                } else {
                    console.log(e.key);
                }
            }
        }
        );

        //         window.addEventListener('blur', ()=>{
        //             this.cursels.forEach((c)=>c.remove());
        //             window.clearInterval(this.interval);
        //         }
        //         );

        //         window.addEventListener('scroll', (e)=>{
        //             console.log(window.scrollY, document.height);
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

    textFromSelection(firstSelection) {
        let text = "";
        const [sl,sc,el,ec] = firstSelection.orderedPositions();
        if (firstSelection.isCursor()) {
            text = "\n" + this.lines()[sl].content;
        } else {
            const lines = this.lines();
            for (let i = sl; i <= el; ++i) {
                const startChar = i == sl ? sc : 0
                const endChar = i == el ? ec : lines[i].textContent.length + 1;
                text += lines[i].textContent.slice(startChar, endChar);
            }
        }
        return text;
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
        const char = Math.round((e.srcElement == this ? e.offsetX : 0) / this.lineWidth);
        const line = Math.min(Math.max(0, Math.round((e.offsetY / this.lineHeight) - 0.4)), lines.length - 1);
        return [Math.min(line, lines.length - 1), Math.min(char, lines[line].content.length)];
    }

    computeCharacterSize() {
        const testSpan = document.createElement('span');
        testSpan.innerHTML = 'a';
        document.body.appendChild(testSpan);
        const rect = testSpan.getBoundingClientRect();
        this.lineHeight = rect.height;
        this.lineWidth = rect.width;
        testSpan.remove();
    }
}

customElements.define('ted-editor', Ted);
