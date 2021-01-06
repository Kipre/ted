import {config} from './config.js';


export class History {
    constructor() {
        this.lastTime = 0;
        this.buffer = [];
        this.pos = 0
    }
    
    async store(cursels, splices) {
        this.pos = 0;
        this.buffer.slice(0, this.buffer.length + this.pos - 1);
        this.buffer.push({cursels, splices});
        if (this.buffer.length > config.historySize)
            this.buffer.shift();
    }
    
    undo(way) {
        this.pos = Math.min(0, Math.max(this.pos + way, -this.buffer.length));
        console.log(this.pos, this.buffer.length);
        return this.buffer[this.buffer.length + this.pos];
    }
}