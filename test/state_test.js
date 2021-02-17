import bro from './brotest/brotest.js';

import {Cursel} from '../src/cursel.js';
import {StateManager} from '../src/state.js';

bro.describe('state manager', ()=>{

    const self = new StateManager(_=>{},false);
    self.lines = ['this', 'is some', 'text', 'some other lines', 'and some encore'];

    bro.test('test lines from cursel', _=>{

        bro.expect(self.linesFromCursel(new Cursel(1, 3, 2, 4))).toEqual(['some', 'text']);
        bro.expect(self.linesFromCursel(new Cursel(1, 3, 2, 4), true)).toEqual(['is some', 'text']);
        bro.expect(self.linesFromCursel(new Cursel(1, 0, 0, 4))).toEqual(['', '']);
        bro.expect(self.linesFromCursel(new Cursel(1, 0, 0, 4), true)).toEqual(['this', 'is some']);
        bro.expect(self.linesFromCursel(new Cursel(2, 0, 4, 15))).toEqual(['text', 'some other lines', 'and some encore']);
    }
    );
}
)
