const config = {
    maxLength: 0.9,
    minLength: 0.2
}

export class VerticalScrollbar extends HTMLElement {
    constructor(viewportSize, limit, charHeight) {
        super();
        this.charHeight = charHeight;
        this.viewportSize = viewportSize - 10;
        this.style.right = `${3}px`;
        this.style.width = `${10}px`;
        this.update(0, limit);

        this.moving = false;

        this.onmousedown = (e)=>{
            e.preventDefault();
            this.moving = true;
        }

        window.addEventListener('mousemove', e=>{
            if (this.moving)
                this.parentNode.scroll(0.78 * e.movementY * this.limit / (this.viewportSize - this.length));
        }
        );

        window.addEventListener('mouseup', ()=>{
            this.moving = false
        }
        )
    }

    update(position, limit) {
        this.length = this.viewportSize * (this.charHeight / (limit + this.charHeight)) ** (1 / 5);
        const pos = (this.viewportSize - this.length) * (position / limit)
        this.limit = limit
        this.style.height = `${this.length}px`;
        this.style.top = `${pos}px`;
    }
}

customElements.define('ted-vscrollbar', VerticalScrollbar);

export class HorizontalScrollbar extends HTMLElement {
    constructor(nbChar, charWidth) {
        super();
        this.charWidth = charWidth;
        this.nbChar = nbChar;
        this.style.bottom = `${3}px`;
        this.style.height = `${13}px`;
        this.update(0, nbChar);

        this.moving = false;

        this.onmousedown = (e)=>{
            e.preventDefault();
            this.moving = true;
        }

        window.addEventListener('mousemove', e=>{
            if (this.moving)
                this.parentNode.scroll(0.78 * e.movementX * this.limit / (this.viewportSize - this.length));
        }
        );

        window.addEventListener('mouseup', ()=>{
            this.moving = false
        }
        )
    }

    update(position, limit) {
        this.length = this.charWidth * (this.charWidth / (limit + this.charWidth)) ** (1 / 5);
        const pos = (this.nbChar * this.charWidth - this.length) * (position / limit);
        this.style.width = `${this.length}px`;
        this.style.left = `${pos + 52}px`;
    }
}

customElements.define('ted-hscrollbar', HorizontalScrollbar);
