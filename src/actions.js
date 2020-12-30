import {Cursel} from './cursel.js';
import {Options} from './options.js';
import {config} from './config.js';

export const defineActions = (ted)=>{
    return {
        backspace: ()=>{
            ted.cursels.filter(c=>c.isCursor()).forEach(c=>c.moveSelection('left', ted.text.lineContext(c.l)));
            ted.input('');
        }
        ,
        selectall: ()=>{
            const sel = new Cursel(0,0);
            const len = ted.text.nbLines - 1;
            sel.update(len, ted.text.length(len));
            ted.cursels = [sel];
            ted.renderCursels();
        }
        ,
        togglecommandline: e=>{
            e.preventDefault();
            const option = ted.querySelector('ted-options');
            if (option)
                option.remove();
            else {
                ted.cursels = [];
                ted.appendChild(new Options(ted.viewport));
            }
        }
        ,
        moveselect: e=>{
            e.preventDefault();
            if (e.key.includes("Arrow")) {
                ted.cursels.forEach(c=>{
                    c.moveSelection(e.key.slice(5).toLowerCase(), ted.text.lineContext(c.l));
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
            const [fileHandle] = await window.showOpenFilePicker();
            console.log(fileHandle);
            const file = await fileHandle.getFile();
            const contents = await file.text();
            ted.text.addFile(fileHandle.name, contents);
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
