import {config} from './config.js';


class Lines {
    constructor(text) {
        this.lines = text.split('\n');
    }
    
    insert(line, char, text) {
        const newLines = text.split('\n');
        const nLines = newLines.length;
        newLines[0] = this.lines[line].slice(0, char) + newLines[0];
        newLines[nLines - 1] += this.lines[line].slice(char);
        this.lines.splice(line, 1, ...newLines);
        return 
    }
}

const a = new Lines('some\nfucking\ntext');
console.log(a.insert(1, 2, '---'));
console.log(a);