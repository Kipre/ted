const config = {
    thickness: 10,
    offset: 3,
    horizontal: {
        viewAdjustment: -67,
        thickness: 'height',
        offset: 'bottom',
        setLength: (here, length)=>{here.style.width = `${length}px`},
        setPosition: (here, pos)=>{here.style.left = `${pos + 52}px`},
        axis: 'X'
    },
    vertical: {
        viewAdjustment: -4,
        offset: 'right',
        thickness: 'width',
        setLength: (here, length)=>{here.style.height = `${length}px`},
        setPosition: (here, pos)=>{here.style.top = `${pos + 2}px`},
        axis: 'Y'
    }
}

export class Scrollbar extends HTMLElement {
    constructor(viewSize, orientation) {
        super();
        const orient = config[orientation];
        this.viewSize = viewSize + (orient.viewAdjustment || 0);
        this.style[orient.thickness] = `${config.thickness}px`;
        this.style[orient.offset] = `${config.offset}px`;

        this.update = (p, mp) => {
            if (mp == 0) {
                this.hidden = true;
            } else {
                this.length = this.viewSize * (100 / (mp + 100)) ** (1 / 3);
                this.maxPosition = mp;
                const pos = (this.viewSize - this.length) * (p / mp);
                orient.setLength(this, this.length);
                orient.setPosition(this, pos);
                this.hidden = false;
            }
        }

        this.moving = false;

        this.onmousedown = (e)=>{
            e.preventDefault();
            this.moving = true;
        }

        window.addEventListener('mousemove', e=>{
            if (this.moving)
                this.parentNode.scroll({["delta" + orient.axis]: this.maxPosition * e["movement" + orient.axis]/(this.viewSize - this.length)});
        });

        window.addEventListener('mouseup', ()=>{
            this.moving = false
        })
    }
}

customElements.define('ted-scrollbar', Scrollbar);

