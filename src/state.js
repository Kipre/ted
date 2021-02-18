import {Cursel} from './cursel.js';
import {config} from './config.js';
import {History} from './history.js';

/* some regexes */
const indentRegex = /(^[ \t]*)\S?/;
const nothing = /^ *$/;
const indent = RegExp(`^ {${config.tabSize}}`);

const worker = config.highlight ? new Worker('/src/highlight_worker.js') : null;

const extensions = {
    javascript: ['.js'],
    python: ['.py'],
    cpp: ['.c', '.h', '.cpp', '.hpp']
}

function languageFromName(name) {
    if (!name)
        return;
    for (const [lang,exts] of Object.entries(extensions)) {
        for (const ext of exts) {
            if (name.endsWith(ext))
                return lang;
        }
    }
    return;
}

export class State {

    constructor(text='') {
        this.lines = text.split('\n');
        this.saved = false;
        this.cursels = [];
        this.position = 0;
        this.hPosition = 0;
        this.history = new History();
    }

    element() {
        const item = document.createElement('span');
        item.setAttribute('draggable', 'true');
        item.textContent = this.handle?.name || 'untitled';
        this.domElement = item;
        return item;
    }

    text() {
        return this.lines.join('\n');
    }

    changed() {
        if (this.saved) {
            this.saved = false;
            this.domElement.classList.add('unsaved');
        }
    }

    toObject() {
        return {
            text: this.lines.join('\n'),
            handle: this.handle,
            saved: this.saved,
            pos: this.position,
            hpos: this.hPosition,
            language: this.language
        };
    }

    static async fromHandle(handle) {
        const self = new State();
        self.handle = handle;
        const file = await handle.getFile();
        const tab = ' '.repeat(config.tabSize);
        let text = await file.text();
        text = text.replaceAll(/\t/gm, tab);
        self.lines = text.split('\n');
        self.language = languageFromName(handle.name);
        self.saved = true;
        self.cursels = [];
        return self;
    }

    static fromObject(o) {
        const self = new State();
        self.lines = o.text.split('\n');
        self.handle = o.handle;
        self.saved = o.saved;
        self.categories = o.categories;
        self.cursels = [];
        self.position = o.pos;
        self.hPosition = o.hpos;
        self.language = o.language;
        return self;
    }
}

export class StateManager extends HTMLElement {
    constructor(tedRender, useIndexedDB=true) {
        super();
        this.tedRender = tedRender;
        this.barPosition = 0;
        this.lines = [''];
        this.cursels = [];

        this.addEventListener('wheel', e=>this.scroll(e), {
            passive: true
        });

        this.synchronizeWithDB();
        this.synchronizeWithWorker();
    }

    synchronizeWithDB() {
        const self = this;
        const request = indexedDB.open('ted');

        request.onupgradeneeded = e=>{
            const db = e.target.result;
            const store = db.createObjectStore("states");
            store.add([new State()].map(s=>s.toObject()), 'instances');
            store.add(0, 'active');
        }

        request.onsuccess = e=>{
            self.db = e.target.result;
            const store = self.db.transaction("states").objectStore("states");
            store.get('instances').onsuccess = e=>{
                self.instances = e.target.result.map(o=>State.fromObject(o));
                store.get('active').onsuccess = e=>{
                    self.active = e.target.result;
                }
            }
        }

        window.onbeforeunload = ()=>{
            if (this.db) {
                this.saveState();
                this.storeStates();
            } else if (this.instances.some(s=>!s.saved)) {
                return true;
            }
        }
    }

    synchronizeWithWorker() {
        worker?.addEventListener('message', e=>{
            const message = e.data;
            if (message.type == "everything") {
                this.current.categories = message.categories;
                this.tedRender();
            } else if (message.type == "line") {
                message.categories.forEach((l,i)=>{
                    this.current.categories[i + message.line] = l;
                }
                );
                this.tedRender();
            } else {
                console.log('unknown message', message);
            }
        }
        );
    }

    pair(i, start, end) {
        return [this.lines[i]?.slice(start, end) ?? String.fromCodePoint(0), this.instances?.[this._act]?.categories?.[i]?.slice(start, end)];
    }

    getRichText(i, start, end) {
        return this.lines[i]?.slice(start, end) ?? String.fromCodePoint(0);
    }

    storeStates() {
        const store = this.db.transaction(["states"], "readwrite").objectStore("states");
        store.put(this.instances.map(s=>s.toObject()), 'instances');
        store.put(this._act, 'active');
    }

    scroll(e) {
        const deltaX = e.deltaX || e.deltaY;
        this.barPosition = Math.max(0, Math.min(this.barPosition + deltaX, this.offsetWidth - this.width));
        this.style.left = `-${this.barPosition}px`;
    }

    setWidth(width) {
        this.width = width;
        this.scroll({
            deltaX: 0,
            deltaY: 0
        });
    }

    cursorContext() {
        if (this.cursels.length != 1 || !this.cursels[0].isCursor())
            return {};
        const {l, c} = this.cursels[0];
        return {
            before: this.lines[l][c - 1] ?? '',
            after: this.lines[l][c] ?? ''
        };
    }

    render() {
        this.innerHTML = '';
        this.style.left = `-${this.barPosition}px`;
        this.instances.forEach((t,i)=>{
            const item = t.element();
            if (i == this.active)
                item.classList.add('active');
            if (!t.saved)
                item.classList.add('unsaved');
            item.ondrag = e=>{
                item.style.display = e.layerY > config.headerHeight ? 'none' : '';
            }
            item.ondragend = e=>{
                if (e.layerY > config.headerHeight) {
                    this.close(i)
                }
            }
            item.onclick = e=>{
                e.preventDefault();
                this.active = i;
                this.tedRender();
            }
            item.onmousedown = e=>{
                if (e.which == 2) {
                    e.preventDefault();
                    this.close(i);
                }
            }
            // Rename tab
            item.ondblclick = e=>{
                if (t.handle) {
                    t.handle.getParent(parent=>t.handle.moveTo(parent, "newname"));
                } else {}
                this.render();
            }
            this.appendChild(item);
        }
        );
    }

    close(i) {
        if (!this.current.saved && !(this.lines.length == 1 && this.lines == '')) {
            if (!window.confirm("Are you sure you want to close this file without saving?"))
                return;
        }
        this.instances.splice(i, 1);
        if (this.instances.length == 0)
            this.instances = [new State()];
        this._act = Math.max(0, Math.min(this.instances.length - 1, i));
        this.updateBinding(this._act);
    }

    get current() {
        return this.instances?.[this._act];
    }

    get active() {
        return this._act;
    }

    saveState() {
        this.instances[this._act].position = this.position;
        this.instances[this._act].hPosition = this.hPosition;
        this.instances[this._act].cursels = this.cursels;
    }

    updateBinding(i) {
        this.categories = null;
        this.lines = this.instances[i].lines;
        this.cursels = this.instances[i].cursels;
        this.position = this.instances[i].position;
        this.hPosition = this.instances[i].hPosition;
        this.current.language = languageFromName(this.instances[i].handle?.name);
        if (this.current.language && config.highlight)
            worker.postMessage({
                type: 'everything',
                language: this.current.language,
                text: this.lines.join('\n')
            });
        this.render();
        this.tedRender?.();
    }

    set active(i) {
        if (this._act !== undefined)
            this.saveState();
        this._act = i;
        this.updateBinding(i);
    }

    get nbLines() {
        return this.lines.length;
    }

    async longestLine() {
        let max = 0;
        for (const line of this.lines)
            if (line.length > max)
                max = line.length;
        return max;
    }

    length(i) {
        return this.lines[i]?.length;
    }

    normalize(line, char) {
        line = Math.max(0, line);
        if (line > this.nbLines - 1) {
            return [this.nbLines - 1, this.length(this.nbLines - 1)]
        }
        return [line, Math.max(0, Math.min(char, this.lines[line].length))];
    }

    moveCursels(way) {
        this.cursels.forEach(c=>c.moveCursor(way, this.lineContext(c.l)))
    }

    lineContext(line) {
        return {
            before: this.lines[line - 1]?.length,
            here: this.lines[line]?.length,
            after: this.lines[line + 1]?.length,
            totalLines: this.lines.length
        };
    }

    input(left, mid='', right='') {
        for (const cursel of this.cursels) {
            this.curselInput(cursel, left, mid, right);
        }
    }

    curselInput(cursel, left, mid='', right='') {
        const [sl,sc,el,ec] = cursel.orderedPositions();
        const oldLines = this.linesFromCursel(cursel);
        const midLines = mid == '' ? [''] : mid(oldLines.join('\n')).split('\n');
        const head = this.lines[sl].slice(0, sc) + left;
        const tail = right + this.lines[el].slice(ec);
        const newLines = head.split('\n');
        const tailLines = tail.split('\n');

        /* append mid lines */
        const newCurselPositions = [sl + newLines.length - 1, newLines[newLines.length - 1].length];
        newLines[newLines.length - 1] += midLines[0];
        newLines.push(...midLines.slice(1));

        /* append tail */
        newCurselPositions.push(sl + newLines.length - 1, newLines[newLines.length - 1].length);
        newLines[newLines.length - 1] += tailLines[0];
        newLines.push(...tailLines.slice(1));
        const lastChar = newLines[newLines.length - 1].length - tail.length;

        /* update highlight categories */
        if (this.current.categories) {
            const newCats = newLines.map(l=>new Uint8Array(l.length));
            try {
                /* fill head categories */
                newCats[0].set(this.current.categories[sl].slice(0, sc))
                /* extrapolate current category for one character */
                newCats[0][sc] = this.current.categories[sl][sc - 1];
                /* fill tail categories */
                newCats[newLines.length - 1].set(this.current.categories[el].slice(ec), lastChar);
            } catch (e) {}
            this.highlightLines(sl, head + midLines.join('\n') + tail);
            this.current.categories.splice(sl, el - sl + 1, ...newCats);
        }

        this.lines.splice(sl, el - sl + 1, ...newLines);
        for (let j = 0; j < this.cursels.length; j++)
            if (this.cursels[j] !== cursel)
                this.cursels[j].adjust(el, ec, el + newLines.length - oldLines.length, lastChar);
        cursel.relocate(...newCurselPositions);
        cursel.tighten();
        this.current.changed();
    }

    highlightLines(lineNumber, text) {
        if (this.current.language)
            worker?.postMessage({
                type: 'line',
                line: lineNumber,
                text: text,
                language: this.current.language
            })
    }

    unredo(way) {
        const hist = this.current.history.undo(way)
        if (hist) {
            this.cursels = hist.cursels.map(a=>Cursel.fromArray(a));
            hist.splices.forEach((s)=>{
                this.lines.splice(s.i, s.del, ...s.lines);
            }
            );
            this.tedRender();
        }
    }

    textFromCursel(curselIndex) {
        let text;
        const cursel = this.cursels[curselIndex]
        const [sl,sc,el,ec] = cursel.orderedPositions();
        if (cursel.isCursor()) {
            return "\n" + this.lines[cursel.l];
        } else {
            return this.textFromSelection(cursel);
        }
    }

    textFromSelection(cursel) {
        return this.linesFromCursel(cursel).join('\n');
    }

    linesFromCursel(cursel, full=false) {
        let [sl,sc,el,ec] = cursel.orderedPositions();
        if (full) {
            sc = 0;
            ec = this.lines[el].length;
        }
        if (sl == el) {
            return [this.lines[sl].slice(sc, ec)];
        } else {
            const lines = [this.lines[sl].slice(sc)];
            for (let i = sl + 1; i <= el; ++i) {
                lines.push(this.lines[i].slice(0, i == el ? ec: undefined))
            }
            return lines;
        }
    }

    wideCursel(cursel) {
        let [sl,sc,el,ec] = cursel.orderedPositions();
        return new Cursel(sl, 0, el, this.lines[el].length);
    }

    async addFile(handle) {

        this.instances.push(handle ? await State.fromHandle(handle) : new State());
        this.active = this.instances.length - 1;
        this.tedRender();
    }

    async saveFile(state) {
        if (state.handle) {
            const writable = await state.handle.createWritable();
            await writable.write(state.text());
            await writable.close();
        } else {
            await this.saveFileAs(state);
        }
        state.saved = true;
        this.render();
    }

    async saveFileAs(state) {
        const options = {
            types: [{
                description: 'Text Files'
            }]
        };
        state.handle = await window.showSaveFilePicker(options);
        state.language = languageFromName(state.handle.name);
        if (state.language && config.highlight)
            worker.postMessage({
                type: 'everything',
                language: state.language,
                text: state.lines.join('\n')
            });
        await this.saveFile(state);
    }

    indentation(i) {
        const res = indentRegex.exec(this.lines[i]);
        return res[1].length;
    }

    async openFolder() {
        const dirHandle = await window.showDirectoryPicker();
        for await(const entry of dirHandle.values()) {
            console.log(entry.kind, entry.name);
        }
    }
}

customElements.define('ted-header', StateManager);
