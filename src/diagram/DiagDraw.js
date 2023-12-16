
const ELK = require('elkjs')
const elk = new ELK()

const { EDGE_TYPE,channelID,flowID } = require('../SystemModel')
const { DiagramPainter } = require("./DiagramPainter")

const DRAW_MARGIN_HEIGHT = 10;
const DRAW_TEXT_HEIGHT = 30;
const DRAW_CHAR_WIDTH = 10;
const DRAW_MARGIN_WIDTH = 20;
const DRAW_CHANNEL_RADIUS = 20;


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



/**
 * Using the given SVG object, draws the given graph
 * @param {SVG} draw The SVG.js container object, with SVG.js API.
 * @param {Graph} graph The graph object, as returned from layout model
 * @returns A mapping of the model ids to the relevant svg elements for that model
 */
function drawGraph(draw,graph)
{
    if (!draw) throw new Error("Invalid SVG drawing container when drawing a graph")
    console.log(graph)

    let painter = new DiagramPainter(draw,graph)
    graph.children.forEach(child => {
        if (graphNodeRepresentsAnActor(child))
            painter.drawActor(child)
        else   
            painter.drawChannel(child)
    })

    //draw lines
    graph.edges.forEach(edge => {
        painter.drawEdge(edge)
    })
    return painter
}

function redrawEdges(point, graphNode,graph, svgEl)
{
    /*
    1. determine edges connected to the graph node.
    2. for each edge in edges: reroute edge
    */
    let incomingEdges = graph.edges.filter(edge => edge.sources.includes(graphNode.id))
    let outgoingEdges = graph.edges.filter(edge => edge.targets.includes(graphNode.id))

    incomingEdges.forEach(e => { rerouteEdge(e,point,graphNode,svgEl) })
    outgoingEdges.forEach(e => { rerouteEdge(e,point,graphNode,svgEl) })
}

function rerouteEdge(edge,point,graphNode,svgEl)
{
    //determine node connection point
    let currentEdgeLastPoint = edge.endPoint
    let nodeConnPoint = {
        x : (svgEl.x() + (svgEl.x() > currentEdgeLastPoint.x ? 0: svgEl.width())),
        y : (svgEl.y() + svgEl.height()/2)
    }

    //determine what's the starting point of the new edge - the last edge point or the starting point of the edge.
    let bendPointCount = edge.sections[0].bendPoints && edge.sections[0].bendPoints.length
    let hasBendPoints = bendPointCount > 0
    let edgeReconnectPoint = hasBendPoints ? 
                            edge.sections[0].bendPoints[bendPointCount-1] : 
                            edge.sections[0].startPoint
    let edgePoints = hasBendPoints ? 
                    edge.sections[0].bendPoints.slice(0,bendPointCount-1) : 
                    []
    
    let dx = nodeConnPoint.x - edgeReconnectPoint.x;
    let dy = nodeConnPoint.y - edgeReconnectPoint.y;

    //determine which sections to add, by adding relevant bend points.
    if (dx != 0 && dy != 0)
    { //1 vertical segment + 2 horizontal segments => 2 bend points
        edgePoints.push({x : edgeReconnectPoint.x + (dx/2), y : edgeReconnectPoint.y})
        edgePoints.push({x : edgeReconnectPoint.x + (dx/2), y : edgeReconnectPoint.y + dy})
    }
    if (dx != 0 || dy != 0) //if they're both 0, there's nothing to reconnect, otherwise, always add the node connection point
        edgePoints.push(nodeConnPoint)
    
    //last point is the end point, anything before that is the new set of bend points
    if (edgePoints.length > 1)
        edge.bendPoints = edgePoints.slice(0,edgePoints.length-1)
    if (edgePoints.length > 0)
        edge.endPoint = edgePoints[edgePoints.length-1]

    /*
     Now redraw the edge
     1. remove current line and arrow heads
     2. draw the edge again
     */
}


class SVGEventHandler
{
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
            this.dropCallback({x : evt.x, y : evt.y})
    }
}

module.exports = {
    layoutModel,
    drawGraph
}