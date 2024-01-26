

const PREV_COLOR_KEY = 'prevColor'

const DRAW_MARGIN_HEIGHT = 5
const DRAW_TEXT_HEIGHT = 10
const DRAW_CHAR_WIDTH = 8;
const DRAW_MARGIN_WIDTH = 1;

const LINE_SVG_NODE_NAME = 'path';

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
        
        let msgbox = this._drawMsgBoxForElement(channelID,message)

        let g = svgElements.find(e => e.node.nodeName == 'g')
        let circle = g.findOne('circle')
        msgbox.cx(circle.cx())
        msgbox.cy(circle.cy())

    }

    /**
     * Shows a message box on the SVG elements corresponding to the elements for the given data flow id
     * @param {String} dataFlowID The id of the data flow (model) element
     * @param {String} message The message to show on the flow edge
     */
    showMessageOnDataFlow(dataFlowID,message)
    {
        let svgElements = this.svgElements[dataFlowID]
        
        let msgbox = this._drawMsgBoxForElement(dataFlowID,message)

        let line = svgElements.find(el => el.graphEl.id == dataFlowID).findOne(LINE_SVG_NODE_NAME)
        if (!line) throw new Error(`No line found for data flow ${dataFlowID}`)
        msgbox.cx(line.cx())
        msgbox.cy(line.cy())
    }

    _drawMsgBoxForElement(elementID,message)
    {
        let h = DRAW_MARGIN_HEIGHT * 2 + DRAW_TEXT_HEIGHT;
        let w = DRAW_CHAR_WIDTH * message.length + 2 * DRAW_MARGIN_WIDTH
        let msgbox = this._drawMsgBox(message,w,h,this.drawingContainer)
        this._setAux(elementID,msgbox) //remember the message box for the element
        return msgbox
    }

    /**
     * If there's a message box on the element designated by the given id - remove it.
     * @param {String} channelID The channel element id
     */
    removeMessageFromChannel(channelID)
    {
        this._removeMessageBoxForModelElement(channelID)
    }

    /**
     * If there's a message box on the element designated by the given id - remove it.
     * @param {String} flowID The data flow element id
     */

    removeMessageFromDataFlow(flowID)
    {
        this._removeMessageBoxForModelElement(flowID)
    }

    _removeMessageBoxForModelElement(elementID)
    {
        let msgBox = this._getAux(elementID)
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
            
            if (el.node.nodeName != LINE_SVG_NODE_NAME)
            {
                let prevColor = el.fill()
                el.remember(PREV_COLOR_KEY,prevColor)
                el.fill(color)
            }
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