const ELK = require('elkjs')
const elk = new ELK()

const { EDGE_TYPE,channelID,flowID,ACTOR_TYPE,
        toID,isTopLevelObject,isContainer,
        isModelObjectContainedIn, 
        getContainedActors, getContainedChannels, getContainedContainers
    } = require('../SystemModel')
const { DiagramPainter, CAPTION_FONT_SIZE } = require("./DiagramPainter")
const { incomingChannelEdgeID, outgoingChannelEdgeID } = require('./DiagramModel')

const DRAW_MARGIN_HEIGHT = 10;
const DRAW_TEXT_HEIGHT = 30;
const DRAW_CHAR_WIDTH = 10;
const DRAW_MARGIN_WIDTH = 10;
const DRAW_CHANNEL_RADIUS = 20;

const ESTIMATED_USER_ACTOR_HEIGHT = 60; //this is derived from how the user actor is drawn. See DiagramPainer._drawUser
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
    let nodes = graphNodesFor(model) //top level actors and channels
    let containers = getTopLevelContainersAsGraphObjects(model)
    let edges = graphEdgesFor(model)

    let graph = {
        id : (model.name || "graph"),
        layoutOptions: { 'elk.algorithm': 'layered', 
                         'elk.edgeRouting' : 'ORTHOGONAL', 
                         'elk.layered.layering.strategy' : 'INTERACTIVE',
                         'elk.layered.nodePlacement.strategy' : 'NETWORK_SIMPLEX'
                    },
        children: nodes.concat(containers),
        edges: edges
    }
    //run layout and return result
    return await elk.layout(graph)
}

function getTopLevelContainersAsGraphObjects(systemModel)
{
    return Object.values(systemModel.containers)
        .filter(c => isTopLevelObject(c)) //'containers' has all the containers, we need only the top level ones here, the nested ones will be recursively added.
        .map(c =>  createContainerGraphObjFor(c,systemModel) )

}

function createContainerGraphObjFor(containerModelObj,system)
{
    let containedActors = getContainedActors(system,containerModelObj).map(actorGraphNodeFor)
    let containedChannels = getContainedChannels(system,containerModelObj).map(channelGraphNodeFor)
    let containedContainers = getContainedContainers(system,containerModelObj).map(cc => createContainerGraphObjFor(cc,system))
    
    let edges = getContainedEdges(system,containerModelObj);

    let containerGraphNode = containerGraphNodeFor(containerModelObj)
    containerGraphNode.children = containedActors.concat(containedChannels).concat(containedContainers)
    containerGraphNode.edges = edges;
    return containerGraphNode
}

/**
 * Gets all edges (channel and data flow edges) contained in the given container
 * @param {SystemModel} system The system model containing all edges
 * @param {Object} container The container object whose edges we want to retrieve
 * @returns {Array} Array of edge objects suitable for graph layout
 */
function getContainedEdges(system, container) 
{
    if (!system) throw new Error("Invalid system model when retrieving container edges");
    if (!container) throw new Error("Invalid container when retrieving container edges");

    let containerChannels = system.channels.filter(c => isModelObjectContainedIn(c,container))
    // Get channel edges
    // const channelEdges = container.channels
    const channelEdges = containerChannels
        // .filter(channel => isModelObjectContainedIn(channel, container))
        .flatMap(channel => [
            { id: incomingChannelEdgeID(channel), sources: [channel.from], targets: [channelID(channel)], type: EDGE_TYPE.CHANNEL }, 
            { id: outgoingChannelEdgeID(channel), sources: [channelID(channel)], targets: [channel.to], type: EDGE_TYPE.CHANNEL }
        ]);

    // Get data flow edges
    let containerDataFlows = system.data_flows.filter(df => isModelObjectContainedIn(df,container))
    const dataFlowEdges = containerDataFlows
    // const dataFlowEdges = container.dataFlows
        // .filter(flow => isModelObjectContainedIn(flow, container))
        .map(f => ({
            id: flowID(f.type, f.from, f.to),
            sources: [f.from],
            targets: [f.to],
            type: EDGE_TYPE.DATA_FLOW
        }));

    return channelEdges.concat(dataFlowEdges);
}

function graphEdgesFor(model) {
    return model.channels
    .filter(c => isTopLevelObject(c))
    .flatMap(channel => {
        return [
                { id: incomingChannelEdgeID(channel), sources: [channel.from], targets: [channelID(channel)], type: "channel" },//TODO: extract channel type constant
                { id: outgoingChannelEdgeID(channel), sources: [channelID(channel)], targets: [channel.to], type: "channel" }
        ];
    }).concat(model.data_flows.filter(f => isTopLevelObject(f)).map(f => {
        return {
            id : flowID(f.type,f.from,f.to),
            sources: [f.from],
            targets: [f.to],
            type: EDGE_TYPE.DATA_FLOW
        };
    }));
}

function actorDim(actor)
{
    return actor.type == ACTOR_TYPE.USER ?
        {
            height : CAPTION_FONT_SIZE + DRAW_MARGIN_HEIGHT * 2 + ESTIMATED_USER_ACTOR_HEIGHT,
            width : DRAW_MARGIN_WIDTH + DRAW_CHAR_WIDTH * actor.caption.length
        } :
        {
            height: DRAW_MARGIN_HEIGHT * 2 + DRAW_TEXT_HEIGHT,
            width: DRAW_CHAR_WIDTH * actor.caption.length + 2 * DRAW_MARGIN_WIDTH
        }
}

function channelDim()
{
    return {
        width: DRAW_CHANNEL_RADIUS,
        height: DRAW_CHANNEL_RADIUS
    }
}

function containerGraphNodeFor(container)
{
    return Object.assign({id : toID(container)},container)
}

function actorGraphNodeFor(actor)
{
    return Object.assign({id : toID(actor)},actor,actorDim(actor))
}

function channelGraphNodeFor(channel)
{
    return Object.assign({id : toID(channel)},channel,channelDim())
}

function graphNodesFor(model) 
{
    //internal nodes and channels are included in containers
    return model.actors.filter(o => isTopLevelObject(o)) 
                    .map(actorGraphNodeFor)
            .concat(model.channels.filter(o => isTopLevelObject(o))
                    .map(channelGraphNodeFor))

}


function graphNodeRepresentsAnActor(node)
{
    if (!node) return false;
    let nodeid = toID(node);
    if (!nodeid) return false;
    return !isContainer(node) && nodeid && (nodeid.indexOf('-') < 0)
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

    //TODO: unify scan of children into single function
    let painter = new DiagramPainter(draw,graph, moveCB)
    //draw top level containers
    graph.children 
        .filter(child => isContainer(child) && isTopLevelObject(child))
        .forEach(child => {
            drawContainer(draw,graph,child,painter)
        })
    //draw top level actors and channels
    graph.children
        .filter(child => !isContainer(child) && isTopLevelObject(child))
        .forEach(child => {
            if (graphNodeRepresentsAnActor(child))
                painter.drawActor(child)
            else   
                painter.drawChannel(child)
        })

    //draw edges
    graph.edges
    .filter(e => isTopLevelObject(e))
    .forEach(edge => {
        painter.drawEdge(edge)
    })
    return painter
}

function drawContainer(draw,graph,container, painter,parentGroup)
{    
    let containerGroup = painter.drawContainerBoundary(container,parentGroup);
    
    container.children //the container graph node, unlike the model object, has a children collection.
                .filter(c => !isContainer(c))
                .forEach(child => {
                    if (graphNodeRepresentsAnActor(child))
                        painter.drawActor(child,containerGroup,container)
                    else   
                        painter.drawChannel(child,containerGroup,container)
                })
    
    //draw nested containers
    container.children
        .filter(child => isContainer(child) && isModelObjectContainedIn(child,container))
        .forEach(child => {
            drawContainer(draw,graph,child,painter,containerGroup)
        })

    //draw edges in this container
    container.edges.forEach(e => {
        painter.drawEdge(e,containerGroup)
    })
    
    //finally, move the container group to the correct position. 
    // This applies the transform to all the children at this point, so has to be run *after* all children are drawn.
    containerGroup.move(container.x,container.y)
}



module.exports = {
    layoutModel,
    drawGraph,

    //for testing. should not be used outside this module.
    graphNodeRepresentsAnActor 
    , getContainedEdges
}