
// const { VMState } = require("./VMState.js")
// const { createParser,getLanguageKeywords } = require("./Lang")
// const { ProgramRunner } = require("./ProgramRunner")
// const {assertIsNum } = require("./util")

const assert = require('assert')
const { SVG } = require('@svgdotjs/svg.js')
const ELK = require('elkjs')
const elk = new ELK()

const DRAW_MARGIN_HEIGHT = 10;
const DRAW_TEXT_HEIGHT = 30;
const DRAW_CHAR_WIDTH = 10;
const DRAW_MARGIN_WIDTH = 20;
const DRAW_CHANNEL_RADIUS = 20;

var programRunner = null;
var drawingContainer = null;

function initApp(_drawingContainer)
{
    drawingContainer = _drawingContainer
    return {};
}


const createSVGImpl = (drawingElement) => 
    SVG().addTo(drawingElement).addClass("drawingSVG")

function channelID(channel)
{
    return channel.from + "-" + channel.to
}

async function layoutModel(model)
{
    //create graph structure for layout library
    let nodes = model.actors.map(a => {
        return { id : a.id, 
                 caption : a.caption,
                 height : DRAW_MARGIN_HEIGHT*2 + DRAW_TEXT_HEIGHT,
                 width : DRAW_CHAR_WIDTH * a.caption.length + 2 * DRAW_MARGIN_WIDTH
        }
    }).concat(model.channels.map(c => {
        return { id : channelID(c), 
                 width : DRAW_CHANNEL_RADIUS,
                 height : DRAW_CHANNEL_RADIUS
        }
    }))

    let edges = model.channels.flatMap(channel => {
        return [
            {id : channel.from + "_" + channelID(channel), sources : [channel.from], targets : [channelID(channel)]},
            {id : channelID(channel) + "_" + channel.to, sources : [channelID(channel)], targets : [channel.to]}
        ]
    })

    let graph = {
        id : "test_graph",
        layoutOptions: { 'elk.algorithm': 'layered', 'edgeRouting' : 'ORTHOGONAL' },
        children: nodes,
        edges: edges
    }
    //run layout and return result
    return await elk.layout(graph)
}

function presentModel(model)
{
    let draw = createSVGImpl(drawingContainer)

    layoutModel(model)
    .then(g => drawGraph(draw,g))
}

function drawGraph(draw,graph)
{
    console.log(graph)
    graph.children.forEach(child => {
        child.fillColor = '#ffffff'
        child.lineColor = 'black'
        if (child.id.indexOf('-') < 0) //it's an actor
        {
            drawActor(draw,child,child)
        }
        else drawChannel(draw,child,child)
    })

    //draw lines
    graph.edges.forEach(edge => {
        edge.sections.forEach(section => {
            let line = draw.polyline( [[section.startPoint.x,section.startPoint.y],
                            [section.endPoint.x,section.endPoint.y]])
            line.stroke({width: 1, color : 'black'})
        })
    })
}


function drawActor(draw,actor,actorView)
{
    let g = draw.group();
    let r = g.rect(actorView.width,actorView.height).fill(actorView.fillColor).attr('stroke',actorView.lineColor)
    r.radius(2)
    let t = g.text(actor.caption)
    t.cx(r.cx())
    t.cy(r.cy())
    g.move(actorView.x,actorView.y)
}

function drawChannel(draw,channel, channelView)
{
    let g = draw.group()
    let radius = channelView.radius || 20
    let c = g.circle(radius)
    c.fill('#ffffff')
    c.stroke('black')
    c.x(channelView.x) //move sets corner of circle, so we use cx,cy instead.
    c.y(channelView.y)

}

// function resetState()
// {
//     if (programRunner)
//     {
//         let newState = new VMState(initialCursorCoords.x,initialCursorCoords.y,initialCursorCoords.angle)
//         programRunner.resetTo(newState);
//     }
//     else
//     {
//         console.error("ERROR: application not initialized")
//     }
// }

function parseCode(programCode)
{
    // let parser = createParser(variant)
    // let program = parser(programCode);
    // return program;
    return JSON.parse(programCode); //for now, no code to parse - we get JSON code and return it.
}

module.exports = {
    initApp,
    parseCode,
    // resetState,
    // getLanguageKeywords,
    presentModel
}
