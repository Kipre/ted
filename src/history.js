import {config} from './config.js';


export class History {
    constructor() {
        this.lastTime = 0;
        this.buffer = [];
        this.pos = 0
    }
    
    async store(cursels, splices) {
        this.pos = 0;
        this.buffer.push({cursels, splices});
        if (this.buffer.length > config.historySize)
            this.buffer.shift();
    }
    
    undo(way) {
        this.pos += way;
        return this.buffer[this.buffer.length - 1 + this.pos];
        this.pos = Math.min(0, Math.max(this.pos, config.historySize));
    }
}