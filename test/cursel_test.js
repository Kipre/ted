import bro from './brotest/brotest.js';
import {Cursel} from '../src/cursel.js';

bro.test('test relocate', _=>{
    const c = Cursel.cursor(1, 2)
    c.relocate(1, 3);
    bro.expect(c).toMatchObject({l:1, c:3, tl: null, tc: null});
})

bro.describe('test adjust', _=>{
    bro.test('on a precedent cursor', ()=>{
        const a = Cursel.cursor(1, 4);
        a.adjust(2, 3, 1, 6);
        bro.expect(a).toMatchObject({
            l: 1,
            c: 4,
            tl: null,
            tc: null
        })
    }
    );

    bro.test('on a precedent like a backspace', ()=>{
        const a = Cursel.cursor(1, 4);
        a.adjust(1, 7, 1, 6);
        bro.expect(a).toMatchObject({
            l: 1,
            c: 4,
            tl: null,
            tc: null
        });
        a.adjust(1, 3, 1, 2);
        bro.expect(a).toMatchObject({
            l: 1,
            c: 3,
            tl: null,
            tc: null
        });
    }
    );

    bro.test('just after', ()=>{
        const a = Cursel.cursor(1, 4);
        a.adjust(1, 3, 1, 6);
        bro.expect(a).toMatchObject({
            l: 1,
            c: 7,
            tl: null,
            tc: null
        })
    }
    );

    bro.test('method in a scenario', ()=>{
        const a = Cursel.cursor(1, 4);
        const b = Cursel.cursor(2, 5);
        const c = Cursel.selection(2, 7, 3, 0);
        const d = Cursel.cursor(3, 2);

        const cursels = [a, b, c, d];

        for (const k of cursels) {
            k.adjust(2, 3, 1, 6);
        }
        bro.expect(a).toMatchObject({
            l: 1,
            c: 4,
            tl: null,
            tc: null
        });
        bro.expect(b).toMatchObject({
            l: 1,
            c: 8,
            tl: null,
            tc: null
        });
        bro.expect(c).toMatchObject({
            l: 1,
            c: 10,
            tl: 2,
            tc: 0
        });
        bro.expect(d).toMatchObject({
            l: 2,
            c: 2,
            tl: null,
            tc: null
        });
    }
    );

    bro.test('adjustent of a neighbour', _=>{
        const a = Cursel.cursor(1, 4);
        a.adjust(1, 4, 1, 5);
        bro.expect(a).toMatchObject({
            l: 1,
            c: 5,
            tl: null,
            tc: null
        });
    }
    );
}
);
