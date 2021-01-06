import {Cursel} from './cursel.js';
import {Options} from './options.js';
import {config} from './config.js';

export const defineActions = (ted)=>{
    return {
        backspace: e=>{
            e.preventDefault();
            ted.state.cursels.filter(c=>c.isCursor()).forEach(c=>c.moveSelection('left', ted.state.lineContext(c.l)));
            ted.input('');
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
            ted.input(e.key);
        }
        ,
        bracket: e=>{
            ted.bracket(e.key);
        }
        ,
        delete: e=>{
            ted.state.cursels.filter(c=>c.isCursor()).forEach(c=>{
                c.moveSelection('right', ted.state.lineContext(c.l));
                c.invert();
            }
            );
            ted.input('');
        }
        ,
        copy: ()=>{
            navigator.clipboard.writeText(ted.textFromCursel(0));
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
            const newLine = '\n' + ' '.repeat(config.repeatIndentation * ted.state.indentation(ted.state.cursels[0].l));
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
            navigator.clipboard.writeText(ted.textFromCursel(0));
            ted.input('');
        }
        ,
        nothing: ()=>{}
    }
}
