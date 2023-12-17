const { EDGE_TYPE, ACTOR_TYPE, CHANNEL_TYPE,channelID } = require('../SystemModel')
const { channelIDFromEdgeID } = require('./DiagramModel')
const USER_ACTOR_CAPTION_Y_ADJUSTMENT = 35;

//Since edges are orthogonal, the arrow heads can be in one of 4 directions
const HEAD_DIRECTION = {
    W : "W", N : "N", E : "E", S : "S"
}

const ARROW_W = 10; //constants for now but should really be derived from layout - how much room it has.
const ARROW_H = 10;

class DiagramPainter
{
    constructor(__svgDraw,__graph)
    {
        if (!__svgDraw) throw new Error("Invalid svg drawing object")
        if (!__graph) throw new Error("Invalid graph for diagram painter")

        this._svgElements = {}
        this._svgDraw = __svgDraw
        this._graph = __graph
    }

    get svgElements() { return this._svgElements }

    drawActor(graphEl)
    {
        graphEl.fillColor = '#ffffff'
        graphEl.lineColor = 'black'

        let g = this._svgDraw.group();
        if (graphEl.type == ACTOR_TYPE.USER)
        {
            let u = this._drawUser(g)
            let t = g.text(graphEl.caption)
            t.cx(u.cx())
            t.cy(u.cy() - USER_ACTOR_CAPTION_Y_ADJUSTMENT)

            g.cx(graphEl.x)
            g.cy(graphEl.y)
        }
        else
        {
            let r = g.rect(graphEl.width,graphEl.height).fill(graphEl.fillColor).attr('stroke',graphEl.lineColor)
            if (graphEl.type == ACTOR_TYPE.STORE)
                r.radius(30)
            else
                r.radius(2)
            let t = g.text(graphEl.caption)
            t.cx(r.cx())
            t.cy(r.cy())
            g.move(graphEl.x,graphEl.y)
        }
        graphEl.drawing = g;
        // new SVGEventHandler(g,(point) => { redrawEdges(point,actor,graph,g)} ,actor)
        this._rememberSVGElementForID(graphEl.id,g)
        // return g;
    }

    drawChannel(channel)
    {
        let g = this._svgDraw.group()
        let radius = channel.radius || 20
        let c = g.circle(radius)
        c.fill('#ffffff')
        c.stroke('black')
        c.x(channel.x)
        c.y(channel.y)
        if (channel.type == CHANNEL_TYPE.REQ_RES)
            this._drawReqResDecoration(g,channel)
        else if (channel.type == CHANNEL_TYPE.ASYNC)
            this._drawAsyncChannelDecoration(g,channel)
        channel.drawing = g
        // new SVGEventHandler(g,(point) => { redrawEdges(point,channel,graph,g) },channel)
        // return g;
        this._rememberSVGElementForID(channel.id,g)
    }

    drawEdge(edge)
    {
        let edgeSVGElement = this._drawEdgeLine(edge)
        if (edge.type == EDGE_TYPE.DATA_FLOW)
        {
            this._rememberSVGElementForID(edge.id,edgeSVGElement)
            this._rememberSVGElementForID(edge.id,this._drawArrowHead(edge))
        }
        else if (edge.type == EDGE_TYPE.CHANNEL)
        {
            this._rememberSVGElementForID(channelIDFromEdgeID(edge.id),edgeSVGElement)
        }
    }

    _drawEdgeLine(edge)
    {
        let section = edge.sections[0];
        let bends = section.bendPoints || []
        var points = [[section.startPoint.x,section.startPoint.y]] //points are, in order: start point, bend points (if any), end point.
                        .concat(bends.map(p => [p.x,p.y]))
        points.push([section.endPoint.x,section.endPoint.y])
        return this._svgDraw.polyline(points)
                            .stroke({width: 1, color : 'black'}).fill('none')
    }

    _drawArrowHead(edge)
    {
        let lastSection = edge.sections[edge.sections.length-1]
        let x = lastSection.endPoint.x
        let y = lastSection.endPoint.y
        //point 1 is the tip - given as parameter.
        //point 2 is the bottom right corner, but turned according to direction
        //point 3 is the bottom left corner, also turned.
        let point1 = { x : x, y : y}
        let point2 = {}
        let point3 = {}
    
        let direction = this._determineEdgeEndDirection(edge)
        switch (direction)
        {
            case HEAD_DIRECTION.N : 
                point2.x = x + ARROW_W/2
                point2.y = y + ARROW_H
                point3.x = x - ARROW_W/2
                point3.y = y + ARROW_H
                break;
            case HEAD_DIRECTION.E : 
                point2.x = x - ARROW_H
                point2.y = y + ARROW_W/2
                point3.x = x - ARROW_H
                point3.y = y - ARROW_W/2
                break;
            case HEAD_DIRECTION.S : 
                point2.x = x - ARROW_W/2
                point2.y = y - ARROW_H
                point3.x = x + ARROW_W/2
                point3.y = y - ARROW_H
                break;
            case HEAD_DIRECTION.W : 
                point2.x = x + ARROW_H
                point2.y = y - ARROW_W/2
                point3.x = x + ARROW_H
                point3.y = y + ARROW_W/2
                break;
        }
    
        let polylineCoords = `${point1.x},${point1.y} ${point2.x},${point2.y} ${point3.x},${point3.y}`
        return this._svgDraw.polygon(polylineCoords).fill('black').stroke({width : 1})
    }


    _drawUser(container)
    {
        let g = container.group();
  
        let p1 = g.path("M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z")
                     .attr('stroke-width','2')
        let p2 = g.path("M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z").attr('stroke-width','2')
         return g;
    }

    _drawReqResDecoration(container,channel)
    {
        let incomingEdge = this._channelIncomingEdge(channel);
        let outgoingEdge = this._channelOutgoingEdge(channel)
        let inX = incomingEdge.sections[0].endPoint.x
        let inY = incomingEdge.sections[0].endPoint.y
        let outX = outgoingEdge.sections[0].startPoint.x
        let outY = outgoingEdge.sections[0].startPoint.y
    
        var labelX = channel.x
        var labelY = channel.y
        var text = 'R'
        switch (true)
        {   //direction of channel is determined by the incoming and outgoing edge.
            // this serves to determine the location of the label decoration + the text, specifically the arrow drawn (a unicode character)
            case (inY == outY) && (inX < outX) : //point right
                labelY -= 20;
                text += '\u25B6' 
                break;
            case (inY == outY) && (inX > outX) : //point left
                labelY -= 20;
                text = '\u25C0 R' //note: we're overwriting the text here completely
                break;
            case (inY < outY) && (inX == outX) : //point down
                labelX -= 15;
                text += '\n\u25BC'
                break;
            case (inY > outY) && (inX == outX) : //point up
                labelX -= 15;
                text += '\n\u25B2'
                break;
        }
    
        let textEl = container.text(text)
        textEl.size(8)
        textEl.x(labelX)
        textEl.y(labelY)
    }

    _channelIncomingEdge(channel)
    {
        let incomingEdges = this._findEdgesByTarget(channel)
        if (incomingEdges.length != 1) throw new Error(`Invalid number of incoming edges for channel ${JSON.stringify(channel)}: ${incomingEdges.length}`)
        return incomingEdges[0];
    }

    _channelOutgoingEdge(channel) 
    {
        let outgoingEdges = this._findEdgesBySource(channel)
        if (outgoingEdges.length != 1) throw new Error(`Invalid number of outgoing edges for channel ${JSON.stringify(channel)}: ${outgoingEdges.length}`)
        return outgoingEdges[0];
    }

    /**
     * Find all edges that are incoming to the given node
     * @param {Node} graphNode A node in the graph, representing either an actor or a channel
     * @returns The list of edges where one of the targets is the given node
     */
    _findEdgesByTarget(graphNode)
    {
        return this._graph.edges.filter(e => e.targets.includes(graphNode.id))
    }

    /**
     * Find all edges that are outgoing from the given node
     * @param {Node} graphNode A node in the graph, representing either an actor or a channel
     * @returns The list of edges where one of the sources is the given node.
     */
    _findEdgesBySource(graphNode)
    {
        return this._graph.edges.filter(e => e.sources.includes(graphNode.id))
    }

    _drawAsyncChannelDecoration(container,channel)
    {
        this._drawAsyncArrowhead(container,this._channelIncomingEdge(channel))
        this._drawAsyncArrowhead(container,this._channelOutgoingEdge(channel))
    }

    /**
     * Draw an async arrow head at the end of the given edge.
     * Will determine the direction according to the last bend point (or start point) of the edge.
     * 
     * @param {SVG} container The SVG container object to use for drawing, with SVG.js API.
     * @param {GraphEdge} edge The edge to draw the arrow for, the graph node.
     * @see {_determineEdgeEndDirection}
     */
    _drawAsyncArrowhead(container,edge)
    {
        let x = edge.sections[0].endPoint.x
        let y = edge.sections[0].endPoint.y
        let direction = this._determineEdgeEndDirection(edge)
        let height = ARROW_H
        let point1 = { x : x, y : y}
        let point2 = {}
        let point3 = {}
        switch (direction)
        {
            case HEAD_DIRECTION.N : 
                point2.x = x + ARROW_W/2
                point2.y = y + height
                point3.x = x
                point3.y = y + height
                break;
            case HEAD_DIRECTION.E : 
                point2.x = x - height
                point2.y = y + ARROW_W/2
                point3.x = x - height
                point3.y = y
                break;
            case HEAD_DIRECTION.S : 
                point2.x = x - ARROW_W/2
                point2.y = y - height
                point3.x = x
                point3.y = y - ARROW_H
                break;
            case HEAD_DIRECTION.W : 
                point2.x = x + height
                point2.y = y - ARROW_W/2
                point3.x = x + height
                point3.y = y
                break;
        }
        let polylineCoords = `${point1.x},${point1.y} ${point2.x},${point2.y} ${point3.x},${point3.y}`
        container.polygon(polylineCoords).fill('black').stroke({width : 1})
    }

    _determineEdgeEndDirection(edge)
    {
        let hasBends = edge.sections[0].bendPoints && edge.sections[0].bendPoints.length > 0
        let lastBendPoint = hasBends ? 
                                edge.sections[0].bendPoints[edge.sections[0].bendPoints.length-1] :
                                null
        let startX = lastBendPoint ? 
                        lastBendPoint.x :
                        edge.sections[0].startPoint.x
        let startY = lastBendPoint ? 
                        lastBendPoint.y : edge.sections[0].startPoint.y
        let endX = edge.sections[0].endPoint.x
        let endY = edge.sections[0].endPoint.y
    
        if (startX == endX )
            return startY > endY ?  HEAD_DIRECTION.N : HEAD_DIRECTION.S
        else if (startY == endY)
            return startX > endX ? HEAD_DIRECTION.W : HEAD_DIRECTION.E
    }

    _rememberSVGElementForID(id,svgEl)
    {
        if (!id) throw new Error("Invalid ID for graph element")
        if (!svgEl) throw new Error("Invalid svg element to index")

        if (!this._svgElements[id]) this.svgElements[id] = []

        this._svgElements[id].push(svgEl)
    }
}

module.exports = {
    DiagramPainter
}