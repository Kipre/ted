import bro from './brotest/brotest.js';

import {languageConfig} from '../src/languages.js';

bro.test('test has uncommented line', _=>{
    const regex = languageConfig.javascript.hasUncommentedLine;
    bro.expect(regex.test('hey')).toBe(true);
    bro.expect(regex.test('')).toBe(false);
    bro.expect(regex.test('hey\n  // de')).toBe(true);
    bro.expect(regex.test(' // hey\n')).toBe(false);
    bro.expect(regex.test('//g\n//ok\n\n//nice')).toBe(false);
    bro.expect(regex.test('//g\n//ok\nf\n//nice')).toBe(true);
})