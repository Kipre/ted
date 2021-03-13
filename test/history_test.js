import bro from './brotest/brotest.js';

import {History} from '../src/history.js';
import {Cursel} from '../src/cursel.js';

bro.describe('test history', _=>{

    bro.test('store', _=>{
        const his = new History();
        his.snapshot([new Cursel(1,3)], ['some', 'text here'])
        bro.expect(his.buffer).toEqual([{
            cursels: [[1, 3, 1, 3]],
            text: 'some\ntext here'
        }])
    }
    );

    bro.test('test unredo', _=>{
        const his = new History();
        his.snapshot([new Cursel(1,3)], ['some', 'text here'])
        his.snapshot([], ['some', 'text here and']);
        bro.expect(his.unredo(-1)).toEqual({cursels: [], text: 'some\ntext here and'});
        bro.expect(his.unredo(-1)).toEqual({cursels: [[1, 3, 1, 3]], text: 'some\ntext here'});
        bro.expect(his.unredo(1)).toEqual({cursels: [], text: 'some\ntext here and'});
        bro.expect(his.unredo(1)).toEqual({cursels: [], text: 'some\ntext here and'});
    }
    );
}
)
