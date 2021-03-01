import bro from './brotest/brotest.js';

import {History} from '../src/history.js';
import {Cursel} from '../src/cursel.js';

bro.describe('test history', _=>{

    const his = new History();

    bro.test('store', _=>{
        his.store([new Cursel(1,3)], ['some', 'text here'])
        bro.expect(his.buffer).toMatchObject([{
            cursels: [{
                l: 1,
                c: 3,
                tl: null,
                tc: null
            }],
            text: 'some\ntext here'
        }])
    }
    )
}
)
