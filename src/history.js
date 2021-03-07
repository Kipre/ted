import {config} from './config.js';

export class History {
    constructor() {
        this.buffer = [];
        this.pos = 0
    }
    
    snapshot(cursels, lines) {
        this.buffer = this.buffer.slice(0, this.buffer.length + this.pos);
        this.pos = 0;
        const text = lines.join('\n');
        if (text.length < config.historyMaxLength)
            this.buffer.push({cursels: cursels.map(c => c.toArray()), text});
        if (this.buffer.length > config.historySize)
            this.buffer.shift();
        console.log(this.pos, this.buffer);
    }
    
    unredo(way) {
        this.pos = Math.min(0, Math.max(this.pos + way, -this.buffer.length));
        console.log(this.pos, this.buffer);
        return this.buffer[this.buffer.length + this.pos];
    }
}