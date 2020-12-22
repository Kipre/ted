export const before = (l1,c1,l2,c2)=>{
    return (l1 < l2) || (l1 == l2 && c1 < c2);
}

export class Cursel extends HTMLElement {

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
    }
    connectedCallback() {
        this.render();
        ;
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
        this.cursor.style.top = `${this.l * this.parentElement?.lineHeight}px`;
        this.cursor.style.left = `${51 + this.c * this.parentElement?.lineWidth}px`;

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
            subSelection.style.width = `${(end - start) * this.parentElement.lineWidth}px`;
            subSelection.style.height = `${this.parentElement.lineHeight}px`;
            subSelection.style.top = `${line * this.parentElement.lineHeight}px`;
            subSelection.style.left = `${52 + start * this.parentElement.lineWidth}px`;
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