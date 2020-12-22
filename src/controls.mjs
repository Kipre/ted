export class Controls extends HTMLElement {
    constructor(some) {
        super();

        this.line = document.createElement('input');
        this.line.setAttribute('type', 'text');
        this.appendChild(this.line);

        this.onkeydown = (e) => {
            console.log(e);
        }
    }
}

customElements.define('ted-controls', Controls);