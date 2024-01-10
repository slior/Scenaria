
const EDGE_TYPE = { 
    DATA_FLOW : 'dataflow',
    CHANNEL : 'channel'
}

const ACTOR_TYPE = {
    AGENT : 'agent',
    STORE : 'store',
    USER : 'user'
}

const DATA_FLOW_TYPE = {
    READ : 'read',
    WRITE : 'write'
}

const CHANNEL_TYPE = {
    REQ_RES : 'req_res',
    ASYNC : 'async'
}

const SCENARIO_STEP_TYPE = {
    REQ : 'req',
    RES : 'res',
    DATA_WRITE : 'data_write',
    DATA_READ : 'data_read'
}

const ANNOTATION_KEY = {
    COLOR : 'color',
    PROTO : "prototype",
}
const NULL_MESSAGE = '--'

function channelID(channel)
{
    return `${channel.from}-${channel.to}-${channel.type.toString()}` 
}

function newChannel(type,from,to,channelText = "")
{
    if (!from) throw new Error(`Invalid from actor id when creating channel`)
    if (!to) throw new Error(`Invalid to actor id when creating channel`)

    let ret = {type : type,from : from, to : to, text : channelText }
    ret.id = channelID(ret)
    return ret;
}

function newStep(channel,type,message)
{
    if (!channel || !channel.id) throw new Error(`Invalid channel definition for step: ${JSON.stringify(channel)}`)
    if (!Object.values(SCENARIO_STEP_TYPE).includes(type)) throw new Error(`Invalid channel step type: ${type}`) //TODO: check specifically for channel step types?

    return { type : type, message : (message || NULL_MESSAGE), channel : channel.id}

}

function newDataFlowStep(dataFlow, type, message)
{
    if (!dataFlow || !dataFlow.id) throw new Error(`Invalid data flow for data flow step: ${JSON.stringify(dataFlow)}`)
    if (!Object.values(SCENARIO_STEP_TYPE).includes(type)) throw new Error(`Invalid data flow type for step: ${type}`) //TODO: check specifically for data step types?

    return { type : type, dataflow: dataFlow.id, message : (message || NULL_MESSAGE)}
}

function flowID(type,from,to,message)
{
    return `${type}-${from}-${to}`
}

function newDataFlow(type,from,to,message = "")
{
    if (!Object.values(DATA_FLOW_TYPE).includes(type)) throw new Error(`Invalid data flow type: ${type}`)
    if (!from) throw new Error(`Invalid from actor id when creating data flow`)
    if (!to) throw new Error(`Invalid to actor id when creating data flow`)

    let ret = { type : type, from : from, to : to, text : (message || NULL_MESSAGE)}
    ret.id = flowID(type,from,to,message)
    return ret;
}

function newActor(type,id,caption,note = "", annotations = [])
{
    return { type : type, 
             id : id,
             caption : caption,
             note : note,
             annotations : annotations
            }
}

function newAnnotationDefElement(key,val)
{   
    let ret = {}
    ret[key] = val
    return ret
}

function newSystemModel(actors,channels,dataFlows,scenarios,annotations)
{
    return {
            "name" : "",
            actors : actors,
            channels : channels,
            data_flows : dataFlows,
            scenarios : scenarios,
            annotations : annotations
        }
}

function resolveAnnotations(model)
{
    model.actors.forEach(actor => {
        actor.annotations.map(aID => model.annotations[aID])
                         .filter(ad => ad !== undefined)
                         .forEach(ad => Object.assign(actor,ad))
    })
    return model;
}


module.exports = {
    EDGE_TYPE,
    ACTOR_TYPE,
    CHANNEL_TYPE,
    channelID,
    DATA_FLOW_TYPE,
    newChannel,
    newStep,
    SCENARIO_STEP_TYPE,
    newDataFlow,
    newDataFlowStep,
    flowID,
    newActor,
    ANNOTATION_KEY,
    newAnnotationDefElement,
    newSystemModel,
    resolveAnnotations,

}