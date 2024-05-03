
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

const ID_KEY = "_id"

function channelID(channel)
{
    return `${channel.from}-${channel.to}-${channel.type.toString()}` 
}

/**
 * Create and return a new channel object with the relevant properties set, and id assigned.
 * @param {CHANNEL_TYPE} type The type of the channel
 * @param {String} from id of the originating agent
 * @param {String} to id of the receiving agent
 * @param {String} channelText The text that will appear as a note (tooltip) on the channel. Optional, defaults to empty
 * @returns The new channel object
 */
function newChannel(type,from,to,channelText = "")
{
    if (!from) throw new Error(`Invalid from actor id when creating channel`)
    if (!to) throw new Error(`Invalid to actor id when creating channel`)

    let ret = {type : type,from : from, to : to, text : channelText }
    ret.id = channelID(ret)
    return ret;
}

/**
 * Create a new step for communication over a channel. 
 * @param {Channel} channel A channel object (as returned by newChannel)
 * @param {SCENARIO_STEP_TYPE} type The type of the scenario step
 * @param {String} message The text to show for the this scenario step.
 * @returns The new channel step object, part of a scenario.
 */
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

/**
 * Creates a new instance of a data flow
 * @param {DATA_FLOW_TYPE} type The type of the data flow
 * @param {String} from The id of the source actor
 * @param {String} to The id of the target actor
 * @param {String} message Optional description of the data flowing
 * @returns A new DataFlow object
 */
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

function newSystemModel(actors,channels,dataFlows,scenarios,annotations, containers = {})
{
    return {
            "name" : "",
            actors : actors,
            channels : channels,
            data_flows : dataFlows,
            scenarios : scenarios,
            annotations : annotations,
            containers : containers
        }
}

function newContainer(id, name, actors,channels,dataFlows, annotations, containers)
{
    return {
        id : id,
        name : name,
        actors : actors,
        channels : channels,
        dataFlows : dataFlows,
        annotations : annotations,
        containers : containers
    }
}

function newAnnotation(id,properties)
{
    let ret = { }
    ret[ID_KEY] = id
    return Object.assign(ret,...properties)
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

/**
 * Tests whether the given object represents an actor
 * @param {Object} obj The object to test
 * @returns TRUE iff the object represents an actor type, created with newActor
 * @see newActor
 */
function isActor(obj)
{
    return obj && obj.type && Object.values(ACTOR_TYPE).includes(obj.type)
}

function isChannel(obj)
{
    return obj && obj.type && Object.values(CHANNEL_TYPE).includes(obj.type)
}

/**
 * Tests whether the given object is a data flow
 * @param {Object} obj The object to test
 * @returns TRUE iff the object is a data flow object, created with newDataFlow
 * @see newDataFlow
 */
function isDataFlow(obj)
{
    return obj && obj.type && Object.values(DATA_FLOW_TYPE).includes(obj.type)
}

/**
 * Test whether the given object is an annotation object.
 * @param {Object} obj The object to test
 * @returns TRUE iff the given object represents a valid model annotation
 */
function isAnnotation(obj)
{
    if (!obj) return false;
    let propKeys = Object.keys(obj)
    if (propKeys.length <= 0) return false; //no keys ==> invalid annotation

    //This is kind of a weird way to test that an object is an annotation.
    // TODO: consider creating a proper ctor and using it. Possibly an actual class
    let validAnnotationKeys = Object.values(ANNOTATION_KEY);
    let allAreAnnotationKeys = propKeys.every(key => ID_KEY === key || validAnnotationKeys.includes(key))
    return allAreAnnotationKeys
}

//extract the id of an object that has an id.
function toID(o) 
{
    if (o[ID_KEY])
        return o[ID_KEY]
    else if (o.id) //TODO: all objects should move to use the 'ID_KEY', so this condition wouldn't be necessary
        return o.id
    else return undefined
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
    newContainer,
    isActor,
    isChannel,
    isDataFlow,
    isAnnotation,
    newAnnotation,
    toID

}