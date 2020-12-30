export const before = (l1,c1,l2,c2)=>{
    return (l1 < l2) || (l1 == l2 && c1 < c2);
}

export class Cursel {

    constructor(line, char) {

        // cursor position
        this.l = line;
        this.c = char;
        // tail position
        this.tl = line;
        this.tc = char;
        // historic char position
        this.hc = char;
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
    }

    toSelection() {
        if (this.tl === null) {
            this.tl = this.l;
            this.tc = this.c;
        }
    }

    update(l, c) {
        this.l = l;
        this.c = c;
        this.hc = c;
    }

    orderedPositions() {
        const [tl,tc] = this.isCursor() ? [this.l, this.c] : [this.tl, this.tc];
        if (this.l > tl || (this.l == tl && this.c > tc)) {
            return [tl, tc, this.l, this.c];
        } else {
            return [this.l, this.c, tl, tc];
        }
    }

    move(way, {before, here, after, totalLines}) {
        const lastLine = totalLines - 1;
        switch (way) {
        case 'up':
            if (this.l != 0) {
                this.l = this.l - 1;
                this.c = Math.min(before, this.hc);
            } else {
                this.l = 0;
                this.c = 0;
            }
            break;
        case 'down':
            if (this.l != lastLine) {
                this.l = this.l + 1;
                this.c = Math.min(after, this.hc);
            } else {
                this.l = lastLine
                this.c = here;
            }
            break;
        case 'right':
            const lastChar = here;
            if (this.c == lastChar && this.l != lastLine)
                this.update(this.l + 1, 0)
            else if (this.l != lastChar)
                this.update(this.l, this.c + 1);
            break;
        case "left":
            if (this.c == 0 && this.l != 0)
                this.update(this.l - 1, Math.max(before, this.c));
            else if (this.c != 0)
                this.update(this.l, this.c - 1);
            break;
        default:
            console.log(`unknown way ${way}`);
        }
        //         console.log(this.l, this.c, this.tl, this.tc, this.hc);
    }

    moveSelection(way, context) {
        if (this.isCursor())
            this.toSelection();
        this.move(way, context);
    }

    moveCursor(way, context) {
        if (!this.isCursor()) {
            if (way == 'left' || way == 'up') {
                const [l,c,_1,_2] = this.orderedPositions();
                this.toCursor(l, c);
            } else if (way == 'right' || way == 'down') {
                const [_1,_2,l,c] = this.orderedPositions();
                this.toCursor(l, c);
            }
        } else
            this.move(way, context);
    }

    adjust(line, char, deltaLine, deltaChar) {
        if (this.l == line && this.c >= char)
            this.c += deltaChar;
        if (this.l >= line)
            this.l += deltaLine;
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
            return true;
        }
        // if overlap
        if (this.inside(osl, osc) || this.inside(oel, oec) || other.inside(sl, sc) || other.inside(el, ec)) {
            [sl,sc] = before(sl, sc, osl, osc) ? [sl, sc] : [osl, osc];
            [el,ec] = !before(el, ec, oel, oec) ? [el, ec] : [oel, oec];
            this.tl = sl;
            this.tc = sc;
            this.l = el;
            this.c = ec;
            return true;
        }
        return false;
    }
}

export function drawCursel(ted, cursel) {
    if (ted.visible(cursel.l, cursel.c)) {
        const cursor = document.createElement('div');
        cursor.classList.add('cursor');
        cursor.style.top = `${(cursel.l - ted.currentLine) * ted.charHeight}px`;
        cursor.style.left = `${1 + (cursel.c - ted.currentChar) * ted.charWidth}px`;
        ted.relativeDiv.appendChild(cursor);
    }
    const [sl,sc,el,ec] = cursel.orderedPositions();
    for (let i = sl; i <= el; ++i) {
        if (ted.visible(i)) {
            const start = i == sl ? Math.max(sc - ted.currentChar, 0) : 0;
            const end = i == el ? ec - ted.currentChar : ted.nbChars;

            const subSelection = document.createElement('div');
            subSelection.classList.add('selection');
            subSelection.style.width = `${(end - start) * ted.charWidth}px`;
            subSelection.style.height = `${ted.charHeight}px`;
            subSelection.style.top = `${(i - ted.currentLine) * ted.charHeight}px`;
            subSelection.style.left = `${2 + start * ted.charWidth}px`;
            ted.relativeDiv.appendChild(subSelection);
        }
    }
}

// customElements.define('ted-cursel', Cursel);
