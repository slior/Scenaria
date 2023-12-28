
const ELK = require('elkjs')
const elk = new ELK()

const { EDGE_TYPE,channelID,flowID } = require('../SystemModel')
const { DiagramPainter } = require("./DiagramPainter")
const { incomingChannelEdgeID, outgoingChannelEdgeID } = require('./DiagramModel')

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
 * @param { () => void } moveCB An optional callback to be called when a node was moved
 * @returns A mapping of the model ids to the relevant svg elements for that model
 */
function drawGraph(draw,graph, moveCB = () => {})
{
    if (!draw) throw new Error("Invalid SVG drawing container when drawing a graph")
    console.log(graph)

    let painter = new DiagramPainter(draw,graph, moveCB)
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



module.exports = {
    layoutModel,
    drawGraph
}