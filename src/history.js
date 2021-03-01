import {config} from './config.js';

export class History {
    constructor() {
        this.buffer = [];
        this.pos = 0
    }
    
    async store(cursels, lines) {
        this.pos = 0;
        this.buffer.slice(0, this.buffer.length + this.pos - 1);
        const text = lines.join('\n');
        if (text.length < config.historyMaxLength)
            this.buffer.push({cursels, text});
        else alert('file too big for history');
        if (this.buffer.length > config.historySize)
            this.buffer.shift();
    }
    
    undo(way) {
        this.pos = Math.min(0, Math.max(this.pos + way, -this.buffer.length));
        return this.buffer[this.buffer.length + this.pos];
    }
}