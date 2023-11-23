

const PREV_COLOR_KEY = 'prevColor'

const DRAW_MARGIN_HEIGHT = 5
const DRAW_TEXT_HEIGHT = 10
const DRAW_CHAR_WIDTH = 8;
const DRAW_MARGIN_WIDTH = 1;



class DiagramController
{
    constructor(_svgElements,_drawingContainer)
    {
        this.svgElements = _svgElements || {}
        if (!_drawingContainer) throw new Error("Invalid drawing container for diagram controller")
        this.drawingContainer = _drawingContainer;
        
        //an object that allows to remember elements per some diagram element
        this.auxiliaryElements = {}
    }

    /**
     * Highlight the object designated by the given id in the diagram
     * @param {String} id The id of the object in the model to highlight
     * @param {String} color The color (css value) to use for highlight
     */
    highlight(id, color)
    {
        if (!color) throw new Error (`Invalid color for highlight: ${color}`)
        this._forAllElementsMappedTo(id,el => {
            this._applyColorRecursively(el,color)
        })
    }

    /**
     * De-highlight (reset color) the object designated by the given id, in the diagram.
     * @param {String} id The id of the object in the model to de-highlight
     */
    deHighlight(id)
    {
        this._forAllElementsMappedTo(id, el => {
            this._resetColorRecursively(el)
        })
    }

    /**
     * Display the given message on the given channel designated by the given id.
     */
    showMessageOnChannel(channelID,message)
    {
        let svgElements = this.svgElements[channelID]
        
        let h = DRAW_MARGIN_HEIGHT * 2 + DRAW_TEXT_HEIGHT;
        let w = DRAW_CHAR_WIDTH * message.length + 2 * DRAW_MARGIN_WIDTH
        let msgbox = this._drawMsgBox(message,w,h,this.drawingContainer)
        this._setAux(channelID,msgbox) //remember the message box for the channel

        let g = svgElements.find(e => e.node.nodeName == 'g')
        let circle = g.findOne('circle')
        msgbox.cx(circle.cx())
        msgbox.cy(circle.cy())

    }

    removeMessageFromChannel(channelID)
    {
        let msgBox = this._getAux(channelID)
        if (msgBox)
            msgBox.remove()
    }

    
    //we specify these as separate functions so we encapsulate the data structure used here.
    _setAux(key,value)
    {
        this.auxiliaryElements[key] = value
    }

    _getAux(key)
    {
        return this.auxiliaryElements[key] || null;
    }

    _drawMsgBox(text,w,h,container)
    {
        let g = container.group()
        let r = g.rect(w,h)
                    .fill('silver')
                    .attr('stroke','darkblue')
                    .attr('fill-opacity','1')
        r.radius(3)
        let t = g.text(text)
        t.font({
            'family' : 'courier',
            'size' : '10',
            'anchor' : 'middle',
        })
        t.stroke('darkblue')
        t.cx(r.cx())
        t.cy(r.cy())
        return g;
    }

    _forAllElementsMappedTo(id,func)
    {
        if (!this.svgElements[id]) throw new Error(`Couldn't find svg element for id: ${id}`)
        this.svgElements[id].forEach(func)
    }

    _applyColorRecursively(svgEl,color)
    {
        svgEl.each((i,children) => {
            let el = children[i]
            let prevColor = el.fill()
            el.remember(PREV_COLOR_KEY,prevColor)
            el.fill(color)
        },true) //true here -> recurse to sub svg elements.
    }

    _resetColorRecursively(svgEl)
    {
        svgEl.each((i,children) => {
            let el = children[i]
            let prevColor = el.remember(PREV_COLOR_KEY)
            if (prevColor) el.fill(prevColor)
        }, true)
    }
}

module.exports = {
    DiagramController
}