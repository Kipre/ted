import {Cursel} from './cursel.js';
import {Options} from './options.js';
import {languageConfig} from './languages.js';
import {config} from './config.js';

const nothing = /^ *$/;
const indent = RegExp(`^ {${config.tabSize}}`, 'gm');
const startOfLine = /^(?=.*\S)/gm;

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
            ted.state.snapshot();
            for (const cursel of ted.state.cursels) {
                if (cursel.isCursor()) {
                    cursel.toSelection();
                    const {before, after} = ted.state.cursorContext();
                    const context = ted.state.lineContext(cursel.l)
                    const nbSpaces = ted.state.indentation(cursel.l);
                    if (nbSpaces && (nbSpaces % config.tabSize === 0) && (nbSpaces / config.tabSize) === (cursel.c / config.tabSize)) {
                        for (let k = 0; k < config.tabSize - 1; k++)
                            cursel.move('left', context);
                    }
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
        kaction: e=>{
            e.preventDefault();
            console.log(e);
        }
        ,
        /* cycles the content of selections, ignores cursors */
        transpose: e=>{
            ted.state.snapshot();
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
        selectnext: e=>{
            e.preventDefault();
            const cursel = ted.state.cursels[ted.state.cursels.length - 1];
            const [sl,sc,el,ec] = cursel.orderedPositions();
            if (cursel.isCursor())
                return;
            const text = ted.state.textFromSelection(cursel);
            const next = ted.state.match(new RegExp(text,'gm'), el, ec)[0];
            if (next)
                ted.state.cursels.push(next);
            ted.fuseCursels();
        }
        ,
        droplastcursel: e=>{
            e.preventDefault();
            ted.state.cursels.pop();
            ted.renderCursels();
        }
        ,
        togglecomment: ()=>{
            ted.state.snapshot();
            const lang = ted.state.current.language;
            if (lang) {
                const {slComment, slRegex, hasUncommentedLine} = languageConfig[lang];
                for (const cursel of ted.state.cursels) {
                    const [sl,sc,el,ec] = cursel.orderedPositions();
                    const comment = hasUncommentedLine.test(ted.state.lines.slice(sl, el + 1).join('\n'))
                    const [regex,filler] = comment ? [startOfLine, slComment + " "] : [slRegex, ""];
                    for (const vCursel of ted.state.match(regex, sl, 0, el))
                        ted.state.cheapInput(vCursel, filler);
                    ted.state.highlightLines2(sl, el + 1);
                }
                ted.render();
            } else
                console.log('no language to comment');
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
            ted.state.snapshot();
            if (brackets.includes(e.key)) {
                ted.state.input(e.key, x=>x, left[e.key]);
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
            ted.state.snapshot();
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
            ted.state.snapshot();
            navigator.clipboard.readText().then(clipText=>{
                // weird space at the end of pasted lines
                clipText = clipText.replace(/\s\n/g, '\n');
                clipText = clipText.replace(/\t/g, ' '.repeat(config.tabSize));
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
            } catch (e) {}
        }
        ,
        indent: (e)=>{
            e.preventDefault();
            ted.state.snapshot();
            for (const cursel of ted.state.cursels) {
                if (cursel.isCursor()) {
                    ted.state.cheapInput(new Cursel(cursel.l,0), ' '.repeat(config.tabSize));
                } else {
                    const [sl,sc,el,ec] = cursel.orderedPositions();
                    for (const vCursel of ted.state.match(/^(?=.*\S)/gm, sl, 0, el))
                        ted.state.cheapInput(vCursel, ' '.repeat(config.tabSize));
                    ted.state.highlightLines2(sl, el + 1);
                }
            }
            ted.render();
        }
        ,
        unindent: (e)=>{
            e.preventDefault();
            for (const cursel of ted.state.cursels) {
                const [sl,sc,el,ec] = cursel.orderedPositions();
                for (const vCursel of ted.state.match(indent, sl, 0, el))
                    ted.state.cheapInput(vCursel);
                ted.state.highlightLines2(sl, el + 1);
            }
            ted.render();
        }
        ,
        newline: ()=>{
            ted.state.snapshot();
            let language = ted.state.current.language
              , cursel = ted.state.cursels[0];
            if (ted.state.cursels.length == 1 && language) {
                const {newLineIndent: langSpec} = languageConfig[language];
                const {before, after} = ted.state.cursorContext();
                if (ted.state.cursels.length == 1 && langSpec.before.test(before) && langSpec.after.test(after)) {
                    const size = Math.min(config.repeatIndentation * ted.state.indentation(cursel.l), cursel.c)
                    const indent = ' '.repeat(size);
                    ted.state.curselInput(cursel, '\n' + indent + ' '.repeat(config.tabSize), '', langSpec.unindent ? '\n' + indent : '');
                    ted.render();
                    return;
                }
            }
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
            ted.state.snapshot()
            const cursel = ted.state.cursels[0];
            if (cursel?.isCursor()) {
                navigator.clipboard.writeText('\n' + ted.state.lines[cursel.l]);
                ted.state.lines.splice(cursel.l, 1);
                ted.state.cursels.splice(0, 1);
            } else if (cursel) {
                navigator.clipboard.writeText(ted.state.textFromSelection(cursel));
                ted.state.curselInput(cursel, '');
            }
            ted.render();
        }
        ,
        test: ()=>{
            window.open("/test/index.html");
        }
        ,
        nothing: ()=>{}
    }
}
