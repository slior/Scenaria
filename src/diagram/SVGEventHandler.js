class SVGEventHandler
{
    static attachTo(el,dropCB)
    {
        new SVGEventHandler(el,dropCB)
    }

    constructor(el, dropCB)
    {
        if (!el) throw new Error("invalid svg element")
        this.element = el;
        this.isDragging = false;
        this.dropCallback = dropCB

        this.element.on('mousedown',this.handleMouseDown.bind(this))
        this.element.on('mousemove',this.handleMouseMove.bind(this))
        this.element.on('mouseup',this.handleMouseUp.bind(this))
    }

    handleMouseDown(evt)
    {
        this.isDragging = true;
        this.startPoint = { x : evt.x, y : evt.y }
    }

    handleMouseMove(evt)
    {
        if (this.isDragging)
        {
            const dx = evt.x - this.startPoint.x;
            const dy = evt.y - this.startPoint.y;
    
            this.element.dmove(dx, dy);
            this.startPoint = { x : evt.x, y : evt.y };
        }
    }

    handleMouseUp(evt) 
    {
        this.isDragging = false;
        if (this.dropCallback)
            this.dropCallback()
    }
}

module.exports = {
    SVGEventHandler
}