import {Cursel} from './cursel.js';
import {Options} from './options.js';
import {config} from './config.js';

export const defineActions = (ted)=>{
    return {
        backspace: ()=>{
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
        moveselect: e=>{
            e.preventDefault();
            if (e.key.includes("Arrow")) {
                ted.state.cursels.forEach(c=>{
                    c.moveSelection(e.key.slice(5).toLowerCase(), ted.state.lineContext(c.l));
                }
                );
                ted.render();
            }
        }
        ,
        letter: e=>{
            ted.input(e.key);
        }
        ,
        copy: ()=>{
            navigator.clipboard.writeText(ted.textFromCursel(0));
        }
        ,
        paste: ()=>{
            navigator.clipboard.readText().then(clipText=>{
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
                const file = await fileHandle.getFile();
                const contents = await file.text();
                ted.state.addFile(fileHandle.name, contents);
            } catch (e) {
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
            ted.input('\n');
        }
        ,
        nothing: ()=>{}
    }
}
