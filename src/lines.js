import {config} from './config.js';


class Lines {
    constructor(text) {
        this.lines = text.split('\n');
    }
    
    insert(line, char, text) {
        const newLines = text.split('\n');
        const nLines = newLines.length;
        newLines[0] = this.lines[line].slice(0, char) + newLines[0];
        const lastOldChar = newLines[nlines - 1].length;
        newLines[nLines - 1] += this.lines[line].slice(char);
        this.lines.splice(line, 1, ...newLines);
        return [line + nLines - 1, lastOldChar];
    }
    
    insertChar(line, char, charToInsert) {
        console.assert(charToInsert.length == 1 && charToInsert != '\n');
        this.lines[line] = this.lines[line].slice(0, char) + charToInsert + this.lines[line].slice(char);
        return [line, char + 1];
    }
}