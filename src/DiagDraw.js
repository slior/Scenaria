
const ELK = require('elkjs')
const elk = new ELK()

const { EDGE_TYPE, ACTOR_TYPE, CHANNEL_TYPE,channelID,flowID } = require('./SystemModel')

const DRAW_MARGIN_HEIGHT = 10;
const DRAW_TEXT_HEIGHT = 30;
const DRAW_CHAR_WIDTH = 10;
const DRAW_MARGIN_WIDTH = 20;
const DRAW_CHANNEL_RADIUS = 20;
const USER_ACTOR_CAPTION_Y_ADJUSTMENT = 35;



/**
 * Given a system model object, layout the different actors and stores.
 * Return the model object with layout information.
 * 
 * @param {SystemModel} model The model whose diagram we're layout
 * @returns A promise with the model object enriched with layout information (x,y, edges)
 */
async function layoutModel(model)
{
    //create graph structure for layout library
    let nodes = graphNodesFor(model)

    let edges = graphEdgesFor(model)

    let graph = {
        id : (model.name || "graph"),
        layoutOptions: { 'elk.algorithm': 'layered', 
                         'elk.edgeRouting' : 'ORTHOGONAL', 
                         'elk.layered.layering.strategy' : 'INTERACTIVE',
                         'elk.layered.nodePlacement.strategy' : 'NETWORK_SIMPLEX'
                    },
        children: nodes,
        edges: edges
    }
    //run layout and return result
    return await elk.layout(graph)
}

const CHANNEL_EDGE_INCOMING_DELIM = ">>"
const CHANNEL_EDGE_OUTGOING_DELIM = "<<"

function incomingChannelEdgeID(channel)
{
    return channel.from + CHANNEL_EDGE_INCOMING_DELIM + channelID(channel)
}

function outgoingChannelEdgeID(channel)
{
    return channelID(channel) + CHANNEL_EDGE_OUTGOING_DELIM + channel.to
}

function channelIDFromEdgeID(edgeID)
{
    var channelID = '';
    switch (true)
    {
        case edgeID.indexOf(CHANNEL_EDGE_INCOMING_DELIM) > 0 : 
            channelID = edgeID.split(CHANNEL_EDGE_INCOMING_DELIM)[1]
            break;
        case edgeID.indexOf(CHANNEL_EDGE_OUTGOING_DELIM) > 0 : 
            channelID = edgeID.split(CHANNEL_EDGE_OUTGOING_DELIM)[0]
            break;
        //return empty string by default
    }
    return channelID
}

function graphEdgesFor(model) {
    return model.channels.flatMap(channel => {
        return [
                { id: incomingChannelEdgeID(channel), sources: [channel.from], targets: [channelID(channel)], type: "channel" },
                { id: outgoingChannelEdgeID(channel), sources: [channelID(channel)], targets: [channel.to], type: "channel" }
        ];
    }).concat(model.data_flows.map(f => {
        return {
            id : flowID(f.type,f.from,f.to),
            sources: [f.from],
            targets: [f.to],
            type: EDGE_TYPE.DATA_FLOW
        };
    }));
}

function graphNodesFor(model) {
    return model.actors.map(a => {
        return Object.assign({}, a, {
            height: DRAW_MARGIN_HEIGHT * 2 + DRAW_TEXT_HEIGHT,
            width: DRAW_CHAR_WIDTH * a.caption.length + 2 * DRAW_MARGIN_WIDTH
        });
    }).concat(model.channels.map(c => {
        return Object.assign({}, c, {
            id: channelID(c),
            width: DRAW_CHANNEL_RADIUS,
            height: DRAW_CHANNEL_RADIUS
        });
    }));
}

function graphNodeRepresentsAnActor(node)
{
    return node.id && (node.id.indexOf('-') < 0)
}

function rememberSVGElementForID(index,id,svgEl)
{
    if (!index) throw new Error("no index to use")
    if (!id) throw new Error("Invalid ID for graph element")
    if (!svgEl) throw new Error("Invalid svg element to index")

    if (!index[id])
        index[id] = []

    index[id].push(svgEl)
}

/**
 * Using the given SVG object, draws the given graph
 * @param {SVG} draw The SVG.js container object, with SVG.js API.
 * @param {Graph} graph The graph object, as returned from layout model
 *  
 */
function drawGraph(draw,graph)
{
    if (!draw) throw new Error("Invalid SVG drawing container when drawing a graph")
    console.log(graph)
    let svgElements = {}
    graph.children.forEach(child => {
        child.fillColor = '#ffffff'
        child.lineColor = 'black'
        let svgElement = graphNodeRepresentsAnActor(child) ? 
                            drawActor(draw,child,child) : 
                            drawChannel(draw,child,graph)
        rememberSVGElementForID(svgElements,child.id,svgElement)
    })

    //draw lines
    graph.edges.forEach(edge => {
        let edgeSVGElement = drawEdgeLine(draw,edge)
        if (edge.type == EDGE_TYPE.DATA_FLOW)
        {
            rememberSVGElementForID(svgElements,edge.id,edgeSVGElement)
            rememberSVGElementForID(svgElements,edge.id,drawArrowHead(draw,edge))
        }
        else if (edge.type == EDGE_TYPE.CHANNEL)
        {
            rememberSVGElementForID(svgElements,channelIDFromEdgeID(edge.id),edgeSVGElement)
        }
        
    })
    return svgElements
}

function drawEdgeLine(draw,edge)
{
    let section = edge.sections[0];
    let bends = section.bendPoints || []
    var points = [[section.startPoint.x,section.startPoint.y]] //points are, in order: start point, bend points (if any), end point.
                    .concat(bends.map(p => [p.x,p.y]))
    points.push([section.endPoint.x,section.endPoint.y])
    return draw.polyline(points)
                .stroke({width: 1, color : 'black'}).fill('none')
}

//Since edges are orthogonal, the arrow heads can be in one of 4 directions
const HEAD_DIRECTION = {
    W : "W", N : "N", E : "E", S : "S"
}

const ARROW_W = 10; //constants for now but should really be derived from layout - how much room it has.
const ARROW_H = 10;

function drawArrowHead(draw,edge)
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

    let direction = determineEdgeEndDirection(edge)
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
    return draw.polygon(polylineCoords).fill('black').stroke({width : 1})
}

function drawActor(draw,actor,actorView)
{
    let g = draw.group();
    if (actor.type == ACTOR_TYPE.USER)
    {
        let u = drawUser(g)
        let t = g.text(actorView.caption)
        t.cx(u.cx())
        t.cy(u.cy() - USER_ACTOR_CAPTION_Y_ADJUSTMENT)

        g.cx(actorView.x)
        g.cy(actorView.y)
    }
    else
    {
        let r = g.rect(actorView.width,actorView.height).fill(actorView.fillColor).attr('stroke',actorView.lineColor)
        if (actor.type == ACTOR_TYPE.STORE)
            r.radius(30)
        else
            r.radius(2)
        let t = g.text(actor.caption)
        t.cx(r.cx())
        t.cy(r.cy())
        g.move(actorView.x,actorView.y)
    }
    actor.drawing = g;
    return g;
}

function drawUser(container)
{
    let g = container.group();
  
   let p1 = g.path("M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z")
                .attr('stroke-width','2')
   let p2 = g.path("M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z").attr('stroke-width','2')
    return g;
}

function drawChannel(draw,channel,graph)
{
    let g = draw.group()
    let radius = channel.radius || 20
    let c = g.circle(radius)
    c.fill('#ffffff')
    c.stroke('black')
    c.x(channel.x)
    c.y(channel.y)
    if (channel.type == CHANNEL_TYPE.REQ_RES)
        drawReqResDecoration(g,channel,graph)
    else if (channel.type == CHANNEL_TYPE.ASYNC)
        drawAsyncChannelDecoration(g,channel,graph)
    channel.drawing = g
    return g;
}

function drawAsyncChannelDecoration(draw,channel,graph)
{
    drawAsyncArrowhead(draw,channelIncomingEdge(graph,channel))
    drawAsyncArrowhead(draw,channelOutgoingEdge(graph,channel))
}

function determineEdgeEndDirection(edge)
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

/**
 * Draw an async arrow head at the end of the given edge.
 * Will determine the direction according to the last bend point (or start point) of the edge.
 * 
 * @param {SVG} draw The SVG object to use for drawing, with SVG.js API.
 * @param {GraphEdge} edge 
 * @see {determineEdgeEndDirection}
 */
function drawAsyncArrowhead(draw,edge)
{
    let x = edge.sections[0].endPoint.x
    let y = edge.sections[0].endPoint.y
    let direction = determineEdgeEndDirection(edge)
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
    draw.polygon(polylineCoords).fill('black').stroke({width : 1})
}

function channelIncomingEdge(graph,channel)
{
    let incomingEdges = findEdgesByTarget(graph,channel)
    if (incomingEdges.length != 1) throw new Error(`Invalid number of incoming edges for channel ${JSON.stringify(channel)}: ${incomingEdges.length}`)
    return incomingEdges[0];
}

function channelOutgoingEdge(graph,channel)
{
    let outgoingEdges = findEdgesBySource(graph,channel)
    if (outgoingEdges.length != 1) throw new Error(`Invalid number of outgoing edges for channel ${JSON.stringify(channel)}: ${outgoingEdges.length}`)
    return outgoingEdges[0];
}

function drawReqResDecoration(draw,channel,graph)
{
    let incomingEdge = channelIncomingEdge(graph,channel);
    let outgoingEdge = channelOutgoingEdge(graph,channel)
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

    let textEl = draw.text(text)
    textEl.size(8)
    textEl.x(labelX)
    textEl.y(labelY)
}

/**
 * Find all edges that are outgoing from the given node in the given graph
 * @param {Graph} graph The graph object created for layout/drawing purposes
 * @param {Node} node A node in the graph, representing either an actor or a channel
 * @returns The list of edges where one of the sources is the given node.
 */
function findEdgesBySource(graph,node)
{
    return graph.edges.filter(e => e.sources.includes(node.id))
}

/**
 * Find all edges that are incoming to the given node in the given graph
 * @param {Graph} graph The graph object created for layout/drawing purposes
 * @param {Node} node A node in the graph, representing either an actor or a channel
 * @returns The list of edges where one of the targets is the given node
 */
function findEdgesByTarget(graph,node)
{
    return graph.edges.filter(e => e.targets.includes(node.id))
}

module.exports = {
    layoutModel,
    drawGraph
}