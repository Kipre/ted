const config = {
    width: 400,
    fontSize: 30
}

export class Options extends HTMLElement {
    constructor(viewport) {
        super();

        const shadow = this.attachShadow({mode: 'open'});
        
        const background = document.createElement('div');
        background.style.height = `${viewport.height}px`;
        background.style.width = `${viewport.width + 50}px`;
        background.style.left = '-50px';
        shadow.appendChild(background);

        this.line = document.createElement('input');
        this.line.setAttribute('type', 'text');
        this.line.style.fontsize = `${config.fontSize}px`;
//         this.line.style.height = '20px';
        this.line.style.width = `${config.width}px`;
        this.line.value = 'some';
        this.line.onkeydown = console.log;
        background.appendChild(this.line);

        this.onmousedown = (e)=>{
            e.preventDefault();
            console.log(e);
        }
    }
}

customElements.define('ted-options', Options);