
const ELK = require('elkjs')
const elk = new ELK()

const { EDGE_TYPE, ACTOR_TYPE } = require('./SystemModel')

const DRAW_MARGIN_HEIGHT = 10;
const DRAW_TEXT_HEIGHT = 30;
const DRAW_CHAR_WIDTH = 10;
const DRAW_MARGIN_WIDTH = 20;
const DRAW_CHANNEL_RADIUS = 20;

function channelID(channel)
{
    return channel.from + "-" + channel.to
}

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
    let nodes = model.actors.map(a => {
        return Object.assign({},a,{
            height : DRAW_MARGIN_HEIGHT*2 + DRAW_TEXT_HEIGHT,
            width : DRAW_CHAR_WIDTH * a.caption.length + 2 * DRAW_MARGIN_WIDTH
        })
    }).concat(model.channels.map(c => {
        return Object.assign({},c, {
            id : channelID(c), 
            width : DRAW_CHANNEL_RADIUS,
            height : DRAW_CHANNEL_RADIUS
        })
    }))

    let edges = model.channels.flatMap(channel => {
        return [
            {id : channel.from + "_" + channelID(channel), sources : [channel.from], targets : [channelID(channel)], type : "channel"},
            {id : channelID(channel) + "_" + channel.to, sources : [channelID(channel)], targets : [channel.to], type : "channel"}
        ]
    }).concat(model.data_flows.map(f => {
        return {
            id : f.from + "_" + f.to,
            sources : [f.from],
            targets : [f.to],
            type : EDGE_TYPE.DATA_FLOW
        }
    }))

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

function graphNodeRepresentsAnActor(node)
{
    return node.id && (node.id.indexOf('-') < 0)
}

/**
 * Using the given SVG object, draws the given graph
 * @param {SVG} draw The SVG.js container object.
 * @param {Graph} graph The graph object, as returned from layout model
 *  
 */
function drawGraph(draw,graph)
{
    console.log(graph)
    graph.children.forEach(child => {
        child.fillColor = '#ffffff'
        child.lineColor = 'black'
        if (graphNodeRepresentsAnActor(child))
            drawActor(draw,child,child)
        else
            drawChannel(draw,child,child)
    })

    //draw lines
    graph.edges.forEach(edge => {
        drawEdgeLine(draw,edge)
        if (edge.type == EDGE_TYPE.DATA_FLOW)
        {
            let lastSection = edge.sections[edge.sections.length-1]
            let direction = arrowHeadDirectionFrom(lastSection)
            drawArrowHead(draw,lastSection.endPoint.x,lastSection.endPoint.y,direction)
        }
    })
}

function drawEdgeLine(draw,edge)
{
    edge.sections.forEach(section => {
        let bends = section.bendPoints || []
        var points = [[section.startPoint.x,section.startPoint.y]]
                      .concat(bends.map(p => [p.x,p.y]))
        points.push([section.endPoint.x,section.endPoint.y])
        return draw.polyline(points)
                   .stroke({width: 1, color : 'black'}).fill('none')
    })
}

//Since edges are orthogonal, the arrow heads can be in one of 4 directions
const HEAD_DIRECTION = {
    W : "W", N : "N", E : "E", S : "S"
}

function arrowHeadDirectionFrom(edgeSection)
{
    let x1 = edgeSection.startPoint.x
    let y1 = edgeSection.startPoint.y
    let x2 = edgeSection.endPoint.x
    let y2 = edgeSection.endPoint.y

    //TODO: this is too simplistic. need finer direction. based on clock hand angles?
    let ret = HEAD_DIRECTION.N
    switch (true)
    {
        case (x2 < x1) && (y2 == y1) : ret = HEAD_DIRECTION.W; break;
        case (x2 == x1) && (y2 < y1) : ret = HEAD_DIRECTION.N; break;
        case (x2 == x1) && (y2 > y1) : ret = HEAD_DIRECTION.S; break;
        case (x2 > x1) && (y2 == y1) : ret = HEAD_DIRECTION.E; break;
    }

    return ret;
}

function drawArrowHead(draw,x,y,direction)
{
    const ARROW_W = 10; //constants for now but should really be derived from layout - how much room it has.
    const ARROW_H = 15;
    //point 1 is the tip - given as parameter.
    //point 2 is the bottom right corner, but turned according to direction
    //point 3 is the bottom left corner, also turned.
    let point1 = { x : x, y : y}
    let point2 = {}
    let point3 = {}

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
    draw.polygon(polylineCoords).fill('black').stroke({width : 1})
}

function drawActor(draw,actor,actorView)
{
    let g = draw.group();
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

function drawChannel(draw,channelView)
{
    let g = draw.group()
    let radius = channelView.radius || 20
    let c = g.circle(radius)
    c.fill('#ffffff')
    c.stroke('black')
    c.x(channelView.x) //move sets corner of circle, so we use cx,cy instead.
    c.y(channelView.y)

}

module.exports = {
    layoutModel,
    drawGraph
}