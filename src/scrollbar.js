export class Scrollbar extends HTMLElement {
    constructor(viewportHeight, limit, left) {
        super();
        this.viewportHeight = viewportHeight;
        this.style.left = `${left + 40}px`;
        this.update(0, limit);

        this.moving = false;

        this.onmousedown = (e) => {
            e.preventDefault();
            this.moving = true; 
        }

        window.addEventListener('mousemove', e => {
            if (this.moving) {
                this.parentNode.scroll(0.78* e.movementY *  this.limit / (this.viewportHeight - this.length));
            }
        });

        window.addEventListener('mouseup', ()=>{this.moving = false})
    }

    update(position, limit) {
        this.length = 0.5*this.viewportHeight**2 / limit;
        const pos = (this.viewportHeight - this.length) * (position/limit)
        this.limit = limit
        this.style.height = `${this.length}px`;
        this.style.top = `${pos}px`;   
    }
}

customElements.define('ted-scrollbar', Scrollbar);