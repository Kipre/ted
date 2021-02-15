import bro from './brotest/brotest.js';

import {Cursel} from '../src/cursel.js';
import {StateManager} from '../src/state.js';

bro.test('test state manager', _=>{
    const self = new StateManager(_=>{}
    ,false);
    self.lines = ['this', 'is some', 'text', ''];

    bro.expect(self.linesFromCursel(Cursel.selection(1, 3, 2, 4))).toEqual(['some', 'text']);
    bro.expect(self.linesFromCursel(Cursel.selection(1, 0, 0, 4))).toEqual(['', '']);
}
);
