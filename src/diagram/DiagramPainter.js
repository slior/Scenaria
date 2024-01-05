const { EDGE_TYPE, ACTOR_TYPE, CHANNEL_TYPE,channelID } = require('../SystemModel')
const { channelIDFromEdgeID } = require('./DiagramModel')
const { SVGEventHandler } = require('./SVGEventHandler')

const USER_ACTOR_CAPTION_Y_ADJUSTMENT = 35;

//Since edges are orthogonal, the arrow heads can be in one of 4 directions
const HEAD_DIRECTION = {
    W : "W", N : "N", E : "E", S : "S"
}

const ARROW_W = 10; //constants for now but should really be derived from layout - how much room it has.
const ARROW_H = 10;

class DiagramPainter
{
    constructor(__svgDraw,__graph,__moveCB)
    {
        if (!__svgDraw) throw new Error("Invalid svg drawing object")
        if (!__graph) throw new Error("Invalid graph for diagram painter")

        this._svgElements = {}
        this._svgDraw = __svgDraw
        this._graph = __graph
        this._moveCB = __moveCB
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
        addTooltipIfAvailable(graphEl.note,g)
        SVGEventHandler.attachTo(g,() => { 
                                    this._redrawEdges(graphEl,g);
                                    this._raiseNodeMoved();
                                 })
        this._rememberSVGElementForID(graphEl.id,g)
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
        addTooltipIfAvailable(channel.text, c);
        if (channel.type == CHANNEL_TYPE.REQ_RES)
            this._drawReqResDecoration(g,channel)
        SVGEventHandler.attachTo(g,() => { 
                                    this._redrawEdges(channel,g)
                                    this._raiseNodeMoved()
                                })
        this._rememberSVGElementForID(channel.id,g)
    }

    drawEdge(edge)
    {
        let g = this._svgDraw.group(edge.id)
        this._drawEdgeLine(g,edge)

        if (edge.type == EDGE_TYPE.DATA_FLOW)
        {
            this._drawArrowHead(g,edge)
            this._rememberSVGElementForID(edge.id,g)
        }
        else if (edge.type == EDGE_TYPE.CHANNEL)
        {
            let channelID = channelIDFromEdgeID(edge.id)
            let channel =  this._findGraphNode(channelID)
            if (channel && channel.type == CHANNEL_TYPE.ASYNC)
            {
                this._drawAsyncArrowhead(g,edge)
            }
            this._rememberSVGElementForID(channelID,g)
        }
        g.graphEl = edge
    }

    _drawEdgeLine(container,edge)
    {
        let section = edge.sections[0];
        let bends = section.bendPoints || []
        var points = [[section.startPoint.x,section.startPoint.y]] //points are, in order: start point, bend points (if any), end point.
                        .concat(bends.map(p => [p.x,p.y]))
        points.push([section.endPoint.x,section.endPoint.y])
        let svgEl = container.polyline(points)
                            .stroke({width: 1, color : 'black'}).fill('none')
        svgEl.graphEl = edge;
        return svgEl;
    }

    _drawArrowHead(container,edge)
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
        return container.polygon(polylineCoords).fill('black').stroke({width : 1})
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

    _forgetSVGElementsForID(id)
    {
        if (!id) throw new Error("Invalid ID for graph element")
        this._svgElements[id] = []
    }

    _redrawEdges(graphNode, svgEl)
    {
        /*
        1. determine edges connected to the graph node.
        2. for each edge in edges: reroute edge
        */
        let incomingEdges = this._graph.edges.filter(edge => edge.sources.includes(graphNode.id))
        let outgoingEdges = this._graph.edges.filter(edge => edge.targets.includes(graphNode.id))

        incomingEdges.forEach(e => { this._rerouteEdge(e,graphNode,svgEl) })
        outgoingEdges.forEach(e => { this._rerouteEdge(e,graphNode,svgEl) })
    }

    _rerouteEdge(edge,graphNode,svgEl)
    {
        let isIncoming = edge.targets.includes(graphNode.id)

        let otherNode = this._findGraphNode(isIncoming ? edge.sources[0] : edge.targets[0]) //we assume there's only one source/target to an edge.
        if (!otherNode) throw new Error("Invalid edge - couldn't find other node")
        
        let { targetPoint, sourcePoint,isVertical } = findEdgePoints(isIncoming, otherNode, svgEl);

        reconstructEdge(edge, targetPoint, sourcePoint,isVertical); //this will mutate the edge object
        console.log(`new edge: ${JSON.stringify(edge)}`)

        updateGraphNodePositionAttributes(graphNode, svgEl);
        
        this._redrawEdge(edge);
    }

    _redrawEdge(edge) 
    {
        let edgeSVGElements = edge.type == EDGE_TYPE.DATA_FLOW ?
                                this.svgElements[edge.id] :
                                this.svgElements[channelIDFromEdgeID(edge.id)].filter(el => el.graphEl == edge); //only other option is CHANNEL
        
        if (edgeSVGElements)
            edgeSVGElements.forEach(e => e.remove());
        this._forgetSVGElementsForID(edge.id)
        this.drawEdge(edge);
    }

    _findGraphNode(nodeID)
    {
        return this._graph.children.find(c => c.id == nodeID)
    }

    _raiseNodeMoved()
    {
        if (this._moveCB)
            this._moveCB()
    }
}

function addTooltipIfAvailable(text, svgEl)
{
    if (text)
    {
        let t = svgEl.element('title');
        t.words(text);
    }
}

function updateGraphNodePositionAttributes(graphNode, svgEl)
{
    graphNode.x = svgEl.x();
    graphNode.y = svgEl.y();
}

/*
    A very simplistic re-routing: simply connect the two given points with 1 or 3 segments, so the edge remains orthogonal.
    Not taking into account any other elements, only horizontal partitioning of the edge.
 */
function reconstructEdge(edge, targetPoint, sourcePoint, isVertical)
{
    let dx = targetPoint.x - sourcePoint.x;
    let dy = targetPoint.y - sourcePoint.y;
    
    let newBendPoints = [];
    //determine which sections to add, by adding relevant bend points.
    if (dx != 0 && dy != 0)
    { //3 segments => 2 bend points. The only question is how many horizontal and how many vertical
        console.log(`new edge is vertical? - ${isVertical}`)
        if (isVertical)
        { //1 horizontal segment + 2 vertical ones
            newBendPoints.push({ x: sourcePoint.x, y: sourcePoint.y + (dy/2) });
            newBendPoints.push({ x: sourcePoint.x + dx, y: sourcePoint.y + (dy/2) });
        }
        else
        { //1 vertical segment + 2 horizontal segments
            newBendPoints.push({ x: sourcePoint.x + (dx / 2), y: sourcePoint.y });
            newBendPoints.push({ x: sourcePoint.x + (dx / 2), y: sourcePoint.y + dy });
        }
    }
    
    let edgeSection = edge.sections[0]
    edgeSection.bendPoints = newBendPoints; //set it also if it's empty -> a straight edge.

    edgeSection.endPoint = targetPoint;
    edgeSection.startPoint = sourcePoint;
}

/**
 * Find the points of the edge to be redrawn after a node has been moved
 * 
 * @param {Boolean} isIncoming is the edge incoming into the moved node (svgEl)
 * @param {GraphNode} otherNode The graph node at the other end of the edge, with its x, y, width and height attributes
 * @param {SVGElement} svgEl The SVG Element of the moved node, with its new position
 * @returns An object with two points - targetPoint, sourcePoint (x,y) - for the source of the edge and the target of the edge.
 */
function findEdgePoints(isIncoming, otherNode, svgEl) 
{
    let sourceX = isIncoming ? otherNode.x : svgEl.x();
    let sourceY = isIncoming ? otherNode.y : svgEl.y();
    let sourceH = isIncoming ? otherNode.height : svgEl.height();
    let sourceW = isIncoming ? otherNode.width : svgEl.width();
    let targetX = isIncoming ? svgEl.x() : otherNode.x;
    let targetY = isIncoming ? svgEl.y() : otherNode.y;
    let targetH = isIncoming ? svgEl.height() : otherNode.height;
    let targetW = isIncoming ? svgEl.width() : otherNode.width;

    let dx = targetX - sourceX;
    let dy = targetY - sourceY;
    let adx = Math.abs(dx);
    let ady = Math.abs(dy);

    let sourceFace = '';
    let targetFace = '';
    let isVertical = false;
    switch (true) {
        case (adx <= ady) && dy > 0:
            sourceFace = HEAD_DIRECTION.S;
            targetFace = HEAD_DIRECTION.N;
            isVertical = true;
            break;
        case (adx > ady) && dx > 0:
            sourceFace = HEAD_DIRECTION.E;
            targetFace = HEAD_DIRECTION.W;
            isVertical = false;
            break;
        case (adx > ady) && dx <= 0:
            sourceFace = HEAD_DIRECTION.W;
            targetFace = HEAD_DIRECTION.E;
            isVertical = false;
            break;
        case (adx <= ady) && dy <= 0:
            sourceFace = HEAD_DIRECTION.N;
            targetFace = HEAD_DIRECTION.S;
            isVertical = true;
            break;
    }

    let sourcePoint = translatePointByNodeFace({ x: sourceX, y: sourceY }, sourceFace, sourceH, sourceW);
    let targetPoint = translatePointByNodeFace({ x: targetX, y: targetY }, targetFace, targetH, targetW);

    return { targetPoint, sourcePoint, isVertical };
}

function translatePointByNodeFace(point,face,h,w)
{
    let x = point.x;
    let y = point.y;
    switch (face)
    {
        case HEAD_DIRECTION.S : 
            x += w/2;
            y += h;
            break;
        case HEAD_DIRECTION.N : 
            x += w/2;
            break;
        case HEAD_DIRECTION.W : 
            y += h/2;
            break;
        case HEAD_DIRECTION.E : 
            x += w;
            y += h/2
            break;
        default: throw new Error(`Invalid face: ${face}`)
    }
    return {
        x : x,
        y : y
    }
}

module.exports = {
    DiagramPainter
}