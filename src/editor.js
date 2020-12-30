export class Text {

    observedAtributes() {
        return ['saved'];
    }

    constructor(text, name) {
        this.lines = text.split('\n');
        this.name = name || 'untitled';
        this.saved = name ? true : false;
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

export class TextManager extends HTMLElement {
    constructor(text, fileChanged) {
        super();
        this.instances = [new Text(text || '')];
        this.active = 0;
        this.fileChanged = fileChanged;
    }

    render() {
        this.innerHTML = '';
        this.instances.forEach((t,i)=>{
           const item = t.element();
            if (i == this.active)
                item.classList.add('active');
            item.onclick = e=>{
                e.preventDefault();
                this.active = i;
                this.fileChanged();
            }
            this.appendChild(item);
        });
    }

    connectedCallback() {
        this.render();
    }

    get active() {
        return this._act;
    }

    set active(i) {
        this._act = i;
        this.lines = this.instances[i].lines;
        this.render();
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
        this.instances.push(new Text(content, name));
        this.active = len;
        this.fileChanged();
    }
}

customElements.define('ted-header', TextManager);
