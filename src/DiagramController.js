

const PREV_COLOR_KEY = 'prevColor'
const CHANNEL_REQ_COLOR = '#8B008B' //TODO: these colors should not be here. They should be with the 'runStep' function, at the same semantical level
const CHANNEL_RESPONSE_COLOR = '#A9A9A9'

class DiagramController
{
    constructor(_svgElements)
    {
        this.svgElements = _svgElements || {}

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
    DiagramController,
    CHANNEL_REQ_COLOR, 
    CHANNEL_RESPONSE_COLOR
}