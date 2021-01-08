import {Cursel} from './cursel.js';
import {config} from './config.js';
import {History} from './history.js';

const indentRegex = /(^[ \t]*)\S?/;

function chunkSubstr(str, size) {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);

    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size);
    }

    return chunks;
}

export class State {

    constructor(text='') {
        this.lines = text.split('\n');
        this.saved = false;
        this.cursels = [new Cursel(0,0)];
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
            hpos: this.hPosition
        };
    }

    static async fromHandle(handle) {
        const self = new State();
        self.handle = handle;
        const file = await handle.getFile();
        const text = await file.text();
        self.lines = text.split('\n');
        self.categories = this.lines.map(l=>new Uint8Array(l.length));
        self.saved = true;
        self.cursels = [];
        return self;
    }

    static fromObject(o) {
        const newState = new State();
        newState.lines = o.text.split('\n');
        newState.handle = o.handle;
        newState.saved = o.saved;
        newState.cursels = [];
        newState.position = o.pos;
        newState.hPosition = o.hpos;
        return newState;
    }

}

export class StateManager extends HTMLElement {
    constructor(tedRender) {
        super();
        this.tedRender = tedRender;
        this.barPosition = 0;
        this.lines = [''];
        this.cursels = [];
        this.addEventListener('wheel', e=>this.scroll(e), {
            passive: true
        });

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
        return this.instances[this._act];
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
        this.lines = this.instances[i].lines;
        this.cursels = this.instances[i].cursels;
        this.position = this.instances[i].position;
        this.hPosition = this.instances[i].hPosition;
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

    lineContext(line) {
        return {
            before: this.lines[line - 1]?.length,
            here: this.lines[line]?.length,
            after: this.lines[line + 1]?.length,
            totalLines: this.lines.length
        };
    }

    input(text) {
        const curselsToSave = this.cursels.map(c=>c.toArray());
        const linesToSave = []
        this.cursels.forEach((c)=>{
            const [sl,sc,el,ec] = c.orderedPositions();
            const backup = {
                lines: this.lines.slice(sl, el + 1),
                i: sl
            };
            const head = this.lines[sl].slice(0, sc);
            const tail = this.lines[el].slice(ec);
            const newLines = (head + text + tail).split('\n');
            backup.del = newLines.length;
            this.lines.splice(sl, el - sl + 1, ...newLines);
            const last = newLines[newLines.length - 1].length - tail.length;
            c.toCursor(sl + newLines.length - 1, last);
            for (const k of this.cursels) {
                if (k === c)
                    break;
                k.adjust(el, ec, sl - el + newLines.length - 1, last - ec);
            }
            linesToSave.push(backup);
        });
        this.current.changed();
        this.current.history.store(curselsToSave, linesToSave);
    }
    
    aroundCursel(before, after) {
        this.cursels.forEach((c)=>{
            const [sl,sc,el,ec] = c.orderedPositions();
            this.lines[el] = this.lines[el].slice(0, ec) + after + this.lines[el].slice(ec);
            this.lines[sl] = this.lines[sl].slice(0, sc) + before + this.lines[sl].slice(sc);
            c.adjustSelection(sl, 0, before.length);
            for (const k of this.cursels) {
                if (k === c)
                    break;
                k.adjustSelection(el, ec, before.length + after.length);
            }
        });
    }

    unredo(way) {
        let hist;
        if (hist = this.current.history.undo(way)) {
            this.cursels = hist.cursels.map(a=>Cursel.fromArray(a));
            hist.splices.forEach((s)=>{
                this.lines.splice(s.i, s.del, ...s.lines);
            });
            this.tedRender();
        }
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
