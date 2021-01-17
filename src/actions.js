import {Cursel} from './cursel.js';
import {Options} from './options.js';
import {config} from './config.js';

const left = {
    ['{']: '}',
    ['(']: ')',
    ['[']: ']',
    ['"']: '"',
    ["'"]: "'",
    ['`']: '`',
}

const brackets = Object.keys(left);
const leftBrackets = Object.values(left);

export const defineActions = (ted)=>{
    return {
        backspace: e=>{
            e.preventDefault();
            for (const cursel of ted.state.cursels) {
                if (cursel.isCursor()) {
                    cursel.toSelection();
                    cursel.move('left', ted.state.lineContext());
                }
                ted.state.curselInput(cursel, '', '', '');
            }
            ted.render();
            ted.fuseCursels();
        }
        ,
        transpose: e=>{
//             for (const cursel of ted.state.cursels) {
//                 if (cursel.isCursor()) {
//                     cursel.toSelection();
//                     cursel.move('left', ted.state.lineContext());
//                 }
//                 ted.state.curselInput(cursel, '', '', '');
//             }
//             ted.render();
//             ted.fuseCursels();
        }
        ,
        selectall: ()=>{
            const sel = new Cursel(0,0);
            const len = ted.state.nbLines - 1;
            sel.update(len, ted.state.length(len));
            ted.state.cursels = [sel];
            ted.renderCursels();
        }
        ,
        togglecommandline: e=>{
            e.preventDefault();
            const option = ted.querySelector('ted-options');
            if (option)
                option.remove();
            else {
                ted.state.cursels = [];
                ted.appendChild(new Options(ted.viewport));
            }
        }
        ,
        moveselection: e=>{
            e.preventDefault();
            ted.state.cursels.forEach(c=>{
                c.moveSelection(e.key.slice(5).toLowerCase(), ted.state.lineContext(c.l));
            }
            );
            ted.render();
        }
        ,
        move: e=>{
            e.preventDefault();
            ted.state.cursels.forEach(c=>{
                c.moveCursor(e.key.slice(5).toLowerCase(), ted.state.lineContext(c.l));
            }
            );
            ted.render();

        }
        ,
        undo: e=>{
            ted.state.unredo(-1);
        }
        ,
        redo: e=>{
            ted.state.unredo(1);
        }
        ,
        letter: e=>{
            if (brackets.includes(e.key)) {
                ted.state.input(e.key, null, left[e.key]);
                ted.render();
            } else if (leftBrackets.includes(e.key) && ted.state.cursorContext().after === e.key) {
                ted.state.moveCursels('right');
                ted.render();
            } else
                ted.input(e.key);
        }
        ,
        delete: e=>{
            for (const cursel of ted.state.cursels) {
                if (cursel.isCursor()) {
                    cursel.toSelection();
                    cursel.move('right', ted.state.lineContext());
                    cursel.invert();
                }
                ted.state.curselInput(cursel, '', '', '');
            }
            ted.render();
            ted.fuseCursels();
        }
        ,
        copy: ()=>{
            navigator.clipboard.writeText(ted.state.textFromCursel(0));
        }
        ,
        paste: ()=>{
            navigator.clipboard.readText().then(clipText=>{
                // weird backspace at the end of pasted lines
                clipText = clipText.replace(/\s\n/g, '\n');
                ted.input(clipText);
            }
            );
        }
        ,
        open: async e=>{
            e.preventDefault();
            try {
                const [fileHandle] = await window.showOpenFilePicker();
                ted.state.addFile(fileHandle);
            } catch (e) {
                console.log(e);
                return;
            }
        }
        ,
        tab: (e)=>{
            e.preventDefault();
            ted.input(' '.repeat(config.tabSize));
        }
        ,
        newline: ()=>{
            const indent = ' '.repeat(config.repeatIndentation * ted.state.indentation(ted.state.cursels[0].l));
            let newLine = '\n' + indent;
            const {before, after} = ted.state.cursorContext();
            if (before == '{' && after == '}') {
                newLine += ' '.repeat(config.tabSize) + '\n' + indent;
            }
            ted.input(newLine);
        }
        ,
        newfile: e=>{
            e.preventDefault();
            ted.state.addFile();
        }
        ,
        save: e=>{
            e.preventDefault();
            ted.state.saveFile(ted.state.current);
        }
        ,
        openfolder: e=>{
            ted.state.openFolder();
        }
        ,
        cut: e=>{
            navigator.clipboard.writeText(ted.state.textFromCursel(0));
            ted.input('');
        }
        ,
        nothing: ()=>{}
    }
}
