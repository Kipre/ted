import bro from './brotest/brotest.js';

import {History} from '../src/history.js';
import {Cursel} from '../src/cursel.js';

bro.describe('test history', _=>{

    bro.test('store', _=>{
        const his = new History();
        his.snapshot([new Cursel(1,3)], ['some', 'text here'])
        bro.expect(his.buffer).toMatchObject([{
            cursels: [[1, 3, 1, 3]],
            text: 'some\ntext here'
        }])
    }
    )
}
)
