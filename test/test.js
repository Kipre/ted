import {Cursel} from '../cursel.js';

const a = Cursel.cursor(1, 4);
const b = Cursel.cursor(2, 5);
const c = Cursel.selection(2, 7, 3, 0);
const d = Cursel.cursor(3, 2);

const cursels = [a, b, c, d];

for (const k of cursels) {
    k.adjust2(2, 3, 1, 6);
}

console.assert(a.l == 1, a.c == 4, a.tl == null, a.tc == null, a);
console.assert(b.l == 1, b.c == 8, b.tl == null, b.tc == null, b);
console.assert(c.l == 1, c.c == 9, c.tl == 2, c.tc == 0, c);
console.assert(d.l == 2, d.c == 2, d.tl == null, d.tc == null, d);


console.log('%cAll tests complete', 'color: green');