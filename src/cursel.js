export const before = (l1,c1,l2,c2)=>{
    return (l1 < l2) || (l1 == l2 && c1 < c2);
}

export class Cursel {

    constructor(line, char, tailLine, tailChar) {

        // cursor position
        this.l = line;
        this.c = char;

        // tail position
        this.tl = tailLine ?? line;
        this.tc = tailChar ?? char;

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

    relocate(sl, sc, el, ec) {
        if (el === undefined) {
            [this.l,this.c,this.hc,this.tl,this.tc] = [sl, sc, sc, null, null];
            return;
        }
        if (before(sl, sc, el, ec) == before(this.l, this.c, this.tl, this.tc)) {
            [this.l,this.c,this.hc,this.tl,this.tc] = [sl, sc, sc, el, ec];
        } else {
            [this.l,this.c,this.hc,this.tl,this.tc] = [el, ec, ec, sl, sc]
        }
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
            if (this.c == here && this.l != lastLine)
                this.update(this.l + 1, 0)
            else if (this.c != here)
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

    adjust(oldLine, oldChar, newLine, newChar) {
        const [deltaLine,deltaChar] = [newLine - oldLine, newChar - oldChar];
        const pointAdjust = (l,c)=>{
            if (l > oldLine || (l == oldLine && c >= oldChar)) {
                c += deltaChar * (oldLine == l);
                l += deltaLine;
            }
            return [l, c];
        }
        let[sl,sc,el,ec] = this.orderedPositions();
        this.relocate(...pointAdjust(sl, sc), ...pointAdjust(el, ec));
        this.tighten();
    }

    invert() {
        if (!this.isCursor()) {
            [this.l,this.c,this.tl,this.tc] = [this.tl, this.tc, this.l, this.c];
        }
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

    toArray() {
        return [this.l, this.c, this.tl, this.tc];
    }

    static fromArray([l,c,tl,tc]) {
        const res = new Cursel(l,c,tl,tc);
        res.tighten()
        return res;
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
