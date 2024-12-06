const { EDGE_TYPE, ACTOR_TYPE, CHANNEL_TYPE,channelID } = require('../SystemModel')
const { channelIDFromEdgeID } = require('./DiagramModel')
const { SVGEventHandler } = require('./SVGEventHandler')

const USER_CAPTION_MARGIN = 5;
const CAPTION_FONT_SIZE = 14;


//Since edges are orthogonal, the arrow heads can be in one of 4 directions
const HEAD_DIRECTION = {
    W : "W", N : "N", E : "E", S : "S"
}

const ARROW_W = 10; //constants for now but should really be derived from layout - how much room it has.
const ARROW_H = 10;

const DEFAULT_LINE_CORNER_RADIUS = 10;
const WHITE_COLOR = '#ffffff'

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
        graphEl.fillColor = graphEl.color || WHITE_COLOR
        graphEl.lineColor = 'black'

        let g = graphEl.type == ACTOR_TYPE.USER ? 
                 this._drawAndPositionUserActor(graphEl) : 
                 this._drawAndPositionNonUserActor(graphEl)

        addTooltipIfAvailable(graphEl.note,g)
        SVGEventHandler.attachTo(g,() => { 
                                    this._redrawEdges(graphEl,g);
                                    this._raiseNodeMoved();
                                 })
        this._rememberSVGElementForID(graphEl.id,g)
    }

    _drawAndPositionNonUserActor(graphEl)
    {
        let g = this._svgDraw.group();
        let r = g.rect(graphEl.width, graphEl.height).fill(graphEl.fillColor).attr('stroke', graphEl.lineColor);
        if (graphEl.type == ACTOR_TYPE.STORE)
            r.radius(30);
        else
            r.radius(2);
        let t = g.text(function (add) 
                {
                    if (graphEl.prototype)
                        add.tspan(`<<${graphEl.prototype}>>`).font({ size: 9 }).newLine();
                    add.tspan(graphEl.caption).font({ size: CAPTION_FONT_SIZE }).newLine();
                })
                .leading(1.3)
                .attr({ 'text-anchor': 'middle' });
        t.cx(r.cx());
        t.cy(r.cy());
        g.move(graphEl.x, graphEl.y);
        return g;
    }

    _drawAndPositionUserActor(graphEl)
    {
        let g = this._svgDraw.group();
        
        //Note: order of drawing is important here.
        // The text and user icon need to be drawn on top of the rectangle, so the rectangle is drawn first.

        let r = g.rect(graphEl.width,graphEl.height)
                    .fill(graphEl.fillColor)
                    .stroke({ color : 'black', width : 1})
        r.move(0,0)

        let t = g.text(graphEl.caption);
        t.font('size',CAPTION_FONT_SIZE)
        t.cx(graphEl.width/2); //text position is relative to the containing group
        t.y(USER_CAPTION_MARGIN)
        this._drawUser(g,graphEl.width,CAPTION_FONT_SIZE);

        g.x(graphEl.x);
        g.y(graphEl.y);
        return g;
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
        let svgEl = this._drawPathWithRoundedCorners(container,points)
        svgEl.graphEl = edge;
        return svgEl;
    }

    /**
     * Given an SVG container and a list of points, determine the line to draw through these points, with rounded corners.
     * This assumes the points represent an orthogonal edge, i.e. all bends are 90 degrees, and edge sections are either horizontal or vertical.
     * This will mutate the container - add a path element to it.
     * 
     * @param {SVGContainer} container The SVG container to which we need to add the path.
     * @param {[[Number,Number]]} points An array of points (start, bend points, end - x,y pairs) to draw the path on.
     * @returns The new Path element object (SVG.js object).
     */
    _drawPathWithRoundedCorners(container,points)
    {
        var path = container.path();
        let pathStr = `M${points[0][0]} ${points[0][1]}` // Move to the first point

        if (points.length > 2)
        { //we have bend points
            for (var i = 0; i < points.length - 2; i++) // Loop through the points array, creating rounded corners
            {
                let [xlast,ylast] = points[i]
                let [xnext,ynext] = points[i+1]
                let [xnextnext,ynextnext] = points[i+2]
                let isHoriz = ynext == ylast; //is the line to the next point horizontal or vertical

                let curveRadius = determineCornerRadius(points[i],points[i+1],points[i+2])
                let isExtendingPositive = isHoriz ? (xnext > xlast) : (ynext > ylast) //is the next point extends the last point in the positive direction (down or to the right)
                let isCurvingPositive = isHoriz ? ynextnext > ynext : xnextnext > xnext; //is the point after the next extends in the positive direction (down or to the right)
                //The rounded corner starts just before the next point, and ends right after it.
                let [xStartCurve,yStartCurve,xEndCurve,yEndCurve] = determineRoundedCornerPoints(xlast,ylast,xnext,ynext,isHoriz,isExtendingPositive,isCurvingPositive,curveRadius)

                pathStr += " " + (isHoriz ? `H${xStartCurve}` : `V${yStartCurve}`);
                pathStr += ` Q${xnext},${ynext} ${xEndCurve},${yEndCurve}`
                
            }
            let [lastX,lastY] = points[points.length-1]
            pathStr += ` L${lastX},${lastY}`
        }
        else
        { //it's only 2 points - start + end => draw a line to the end point
            pathStr += ` L${points[1][0]},${points[1][1]}`
        }
            
        path.plot(pathStr)
        path.stroke({width: 1, color : 'black'}).fill('none')
        return path;

        function determineCornerRadius(p1,p2,p3)
        {
            let [x1,y1] = p1;
            let [x2,y2] = p2;
            let [x3,y3] = p3;

            let isHoriz = y2 == y1
            let afterBendDistance = isHoriz ? Math.abs(y3-y2) : Math.abs(x3-x2)
            let beforeBendDistance = isHoriz ? Math.abs(x2-x1) : Math.abs(y2-y1)

            let distanceToCompare = Math.min(afterBendDistance,beforeBendDistance)

            return distanceToCompare < DEFAULT_LINE_CORNER_RADIUS ? 
                     distanceToCompare/2 : 
                     DEFAULT_LINE_CORNER_RADIUS
        }
        
        function determineRoundedCornerPoints(xlast,ylast,xnext,ynext,isHoriz,isExtendingPositive,isCurvingPositive, curveRadius)
        {
            return (() => {
                switch (true)
                {
                    case (isHoriz && isExtendingPositive && isCurvingPositive) : 
                        return [xnext-curveRadius,ylast,xnext,ynext+curveRadius];
                    case (isHoriz && isExtendingPositive && !isCurvingPositive) : 
                        return [xnext - curveRadius, ylast, xnext, ynext - curveRadius];
                    case (isHoriz && !isExtendingPositive && isCurvingPositive) : 
                        return [xnext + curveRadius, ylast, xnext, ynext + curveRadius];
                    case (isHoriz && !isExtendingPositive && !isCurvingPositive) : 
                        return [xnext + curveRadius, ylast, xnext, ynext - curveRadius];
                    case (!isHoriz && isExtendingPositive && isCurvingPositive) : 
                        return [xlast, ynext - curveRadius, xnext + curveRadius, ynext];
                    case (!isHoriz && isExtendingPositive && !isCurvingPositive) : 
                        return [xlast, ynext - curveRadius, xnext - curveRadius, ynext];
                    case (!isHoriz && !isExtendingPositive && isCurvingPositive) : 
                        return [xlast, ynext + curveRadius, xnext + curveRadius, ynext];
                    case (!isHoriz && !isExtendingPositive && !isCurvingPositive) : 
                        return [xlast, ynext + curveRadius, xnext - curveRadius, ynext];
                }
            })();
        }
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


    _drawUser(container,w,captionFontSize)
    { //sizes here are 'magic numbers' that seem to fit a simple browser-based drawing.
        //note: element positions are relative to the container.
        let headRadius = 2;
        let size = 6
        let c = container.circle(size*headRadius)
                    .attr('stroke','black')
                    .attr('stroke-width','2')
                    .attr('fill','transparent')
        let headX = w/2
        let headY = size * headRadius + captionFontSize + USER_CAPTION_MARGIN * 2
        c.center(headX,headY)
        let pathStr = `M${headX},${headY+c.radius()} l${size*1.5},${size*3} m${size*-3},0 l${size*1.5},${size*-3} v${size*5} l${size*1.5},${size*3} m${size*-3},0 l${size*1.5},${size*-3}`
        container.path(pathStr)
            .attr('stroke','black')
            .attr('stroke-width','2')
            .attr('fill','transparent')

         return container;
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
    DiagramPainter,
    CAPTION_FONT_SIZE
}