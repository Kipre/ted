export class State {

    constructor(text, name) {
        this.lines = text.split('\n');
        this.name = name || 'untitled';
        this.saved = name ? true : false;
        this.cursels = [];
        this.position = 0;
        this.hPosition = 0;
    }

    element() {
        const item = document.createElement('span');
        item.textContent = (!this.saved ? "*" : "") + this.name;
        this.domElement = item;
        return item;
    }

    changed() {
        if (this.saved) {
            this.saved = false;
            this.domElement.textContent = "*" + this.name;
        }
    }

}

export class StateManager extends HTMLElement {
    constructor(text, tedRender) {
        super();
        this.instances = [new State(text || '')];
        this.active = 0;
        this.tedRender = tedRender;
        this.barPosition = 0;
        this.addEventListener('wheel', e=>this.scroll(e), {
            passive: true
        });
    }

    scroll(e) {
        const deltaX = e.deltaX || e.deltaY;
        this.barPosition = Math.max(0, Math.min(this.barPosition + deltaX, this.offsetWidth - this.width));
        console.log(this.barPosition, deltaX, this.offsetWidth, this.width)
        this.style.left = `-${this.barPosition}px`;
    }

    setWidth(width) {
        this.width = width;
        this.scroll({deltaX: 0, deltaY: 0});
    }

    render() {
        this.innerHTML = '';
        this.style.left = `-${this.barPosition}px`;
        this.instances.forEach((t,i)=>{
            const item = t.element();
            if (i == this.active)
                item.classList.add('active');
            item.onclick = e=>{
                e.preventDefault();
                this.active = i;
                this.tedRender();
            }
            this.appendChild(item);
        }
        );
    }

    connectedCallback() {
        this.render();
    }

    get active() {
        return this._act;
    }

    saveState() {
        if (this._act !== undefined) {
            this.instances[this._act].position = this.position;
            this.instances[this._act].hPosition = this.hPosition;
            this.instances[this._act].cursels = this.cursels;
        }
    }

    set active(i) {
        this.saveState();
        this._act = i;
        this.lines = this.instances[i].lines;
        this.cursels = this.instances[i].cursels;
        this.position = this.instances[i].position;
        this.hPosition = this.instances[i].hPosition;
        this.render();
        this.tedRender?.();
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

    splice(i, del, ...args) {
        this.lines.splice(i, del, ...args);
        this.instances[this.active].changed();
    }

    addFile(name, content) {
        const len = this.instances.length;
        this.instances.push(new State(content,name));
        this.active = len;
        this.tedRender();
    }
}

customElements.define('ted-header', StateManager);
