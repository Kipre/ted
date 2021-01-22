import {Cursel} from './cursel.js';
import {Options} from './options.js';
import {config} from './config.js';

const nothing = /^ *$/;
const indent = RegExp(`^ {${config.tabSize}}`);

const left = {
    ['{']: '}',
    ['(']: ')',
    ['[']: ']',
    ['"']: '"',
    ["'"]: "'",
    ["`"]: "`",
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
                    const {before, after} = ted.state.cursorContext();
                    const context = ted.state.lineContext(cursel.l)
                    if (brackets.includes(before) && after == left[before]) {
                        cursel.move('right', context);
                        cursel.invert();
                    }
                    cursel.move('left', context);
                }
                ted.state.curselInput(cursel, '', '', '');
            }
            ted.render();
            ted.fuseCursels();
        }
        ,
        /* cycle the content of selections, ignores cursors */
        transpose: e=>{
            const selections = ted.state.cursels.filter(c=>!c.isCursor());
            let curText, lastText = ted.state.textFromSelection(selections[selections.length - 1]);
            for (const selection of selections) {
                curText = ted.state.textFromSelection(selection);
                ted.state.curselInput(selection, '', lastText, '');
                lastText = curText;
            }
            ted.render();
            ted.fuseCursels();
        }
        ,
        selectnext: ()=>{}
        ,
        unindent: ()=>{}
        ,
        togglecomment: ()=>{
            for (let i = 0; i < ted.state.cursels.length; i++) {
                ted.state.toggleComment(ted.state.cursels[i]);
            }
            ted.render();
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
            } else {
                for (const cursel of ted.state.cursels) {
                    const wasCursor = cursel.isCursor()
                    ted.state.curselInput(cursel, e.key, '', '');
                    if (wasCursor) {
                        ted.populateSomeLines(cursel.l, cursel.l + 1);
                    } else {
                        ted.populateLines();
                    }
                }
                ted.updateLongestLine();
                ted.renderCursels();
            }
        }
        ,
        delete: e=>{
            for (const cursel of ted.state.cursels) {
                if (cursel.isCursor()) {
                    cursel.toSelection();
                    cursel.move('right', ted.state.lineContext(cursel.l));
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
                // weird space at the end of pasted lines
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
        indent: (e)=>{
            e.preventDefault();
            for (const cursel of ted.state.cursels) {
                ted.state.lineTransform(cursel, (line,first,last)=>{
                    if (!nothing.test(line)) {
                        if (first)
                            cursel.update(cursel.l, Math.max(0, cursel.c + config.tabSize));
                        if (last)
                            cursel.tc = Math.max(0, cursel.tc + config.tabSize);
                        return ' '.repeat(config.tabSize) + line;
                    } else {
                        return '';
                    }
                }
                );
            }
            ted.render();
        }
        ,
        unindent: (e)=>{
            e.preventDefault();
            for (const cursel of ted.state.cursels) {
                ted.state.lineTransform(cursel, (line,first,last)=>{
                    if (indent.test(line)) {
                        if (first)
                            cursel.update(cursel.l, Math.max(0, cursel.c - config.tabSize));
                        if (last)
                            cursel.tc = Math.max(0, cursel.tc - config.tabSize);
                        return line.replace(indent, '');
                    } else {
                        return line;
                    }
                }
                );
            }
            ted.render();
        }
        ,
        newline: ()=>{
            let cursel = ted.state.cursels[0];
            const {before, after} = ted.state.cursorContext();
            if (ted.state.cursels.length == 1 && before == '{' && after == '}') {
                const size = Math.min(config.repeatIndentation * ted.state.indentation(cursel.l), cursel.c)
                const indent = ' '.repeat(size);
                ted.state.curselInput(cursel, '\n' + indent + ' '.repeat(config.tabSize), '', '\n' + indent);
            } else
                for (cursel of ted.state.cursels) {
                    const size = Math.min(config.repeatIndentation * ted.state.indentation(cursel.l), cursel.c)
                    const indent = ' '.repeat(size);
                    ted.state.curselInput(cursel, '\n' + indent);
                }
            ted.render();
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
