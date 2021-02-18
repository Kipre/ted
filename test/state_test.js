import bro from './brotest/brotest.js';

import {Cursel} from '../src/cursel.js';
import {State, StateManager} from '../src/state.js';

bro.describe('state manager', ()=>{
    
    const state = new State('this\nis some\ntext\nsome other lines\nand some encore');
    const self = new StateManager(_=>{},false);
    self.instances = [state];
    self._act = 0;
    self.updateBinding(0);

    bro.test('test lines from cursel', _=>{

        bro.expect(self.linesFromCursel(new Cursel(1, 3, 2, 4))).toEqual(['some', 'text']);
        bro.expect(self.linesFromCursel(new Cursel(1, 3, 2, 4), true)).toEqual(['is some', 'text']);
        bro.expect(self.linesFromCursel(new Cursel(1, 0, 0, 4))).toEqual(['', '']);
        bro.expect(self.linesFromCursel(new Cursel(1, 0, 0, 4), true)).toEqual(['this', 'is some']);
        bro.expect(self.linesFromCursel(new Cursel(2, 0, 4, 15))).toEqual(['text', 'some other lines', 'and some encore']);
    }
    );
   
   bro.test('test input', ()=>{

       const cursel = new Cursel(1, 4);
       self.curselInput(cursel, 'r');
       bro.expect(self.lines).toEqual(['this', 'is srome', 'text', 'some other lines', 'and some encore']);
       bro.expect(cursel).toMatchObject({l: 1, c:5, tl: null, tc: null});
   })
}
)
