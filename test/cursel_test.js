import bro from './brotest/brotest.js';
import {Cursel} from '../src/cursel.js';

bro.describe('test relocate', _=>{
    bro.test('simple case', _=>{
        const c = new Cursel(1, 2)
        c.relocate(1, 3);
        bro.expect(c).toMatchObject({
            l: 1,
            c: 3,
            tl: null,
            tc: null
        });
    });

    bro.test('selection', _=>{
        const c = new Cursel(1, 2, 3, 4)
        c.relocate(0, 2, 2, 4);
        bro.expect(c).toMatchObject({l: 0, c: 2, tl: 2, tc: 4});
        c.relocate(2, 5, 0, 2)
        bro.expect(c).toMatchObject({l: 0, c: 2, tl: 2, tc: 5});
    });

    bro.test('both after', _=>{
        const c = new Cursel(3, 4, 1, 2)
        c.relocate(2, 4, 0, 2);
        bro.expect(c).toMatchObject({l: 2, c: 4, tl: 0, tc: 2});
    })

}
)

bro.describe('test adjust', _=>{
    bro.test('on a precedent cursor', ()=>{
        const a = new Cursel(1, 4);
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
        const a = new Cursel(1, 4);
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
        const a = new Cursel(1, 4);
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
        const a = new Cursel(1, 4);
        const b = new Cursel(2, 5);
        const c = new Cursel(2, 7, 3, 0);
        const d = new Cursel(3, 2);

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
        const a = new Cursel(1, 4);
        a.adjust(1, 4, 1, 5);
        bro.expect(a).toMatchObject({
            l: 1,
            c: 5,
            tl: null,
            tc: null
        });
    }
    );

    bro.test('before and inside', _=>{
        const a = new Cursel(1, 4, 3, 5);
        a.adjust(1, 0, 1, 5);
        a.adjust(3, 2, 3, 5);
        bro.expect(a).toMatchObject({
            l: 1,
            c: 9,
            tl: 3,
            tc: 8
        });
    });

//     bro.test('inside something that dissapeared', _=>{
//         const a = new Cursel(1, 4);
//         a.adjust(1, 6, 1, 0);
//         bro.expect(a).toMatchObject({
//             l: 1,
//             c: 0,
//             tl: null,
//             tc: null
//         })
//     })
}
);
