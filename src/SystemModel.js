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
const CONTAINER_KEY = "_container";

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

    let channelProps = {type : type,from : from, to : to, text : channelText }
    let ret = Object.assign(newModelObject(channelID(channelProps)),channelProps)
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
    if (!channel || !channel[ID_KEY]) throw new Error(`Invalid channel definition for step: ${JSON.stringify(channel)}`)
    if (!Object.values(SCENARIO_STEP_TYPE).includes(type)) throw new Error(`Invalid channel step type: ${type}`) //TODO: check specifically for channel step types?

    return { type : type, message : (message || NULL_MESSAGE), channel : toID(channel)}

}

function newDataFlowStep(dataFlow, type, message)
{
    if (!dataFlow || !dataFlow[ID_KEY]) throw new Error(`Invalid data flow for data flow step: ${JSON.stringify(dataFlow)}`)
    if (!Object.values(SCENARIO_STEP_TYPE).includes(type)) throw new Error(`Invalid data flow type for step: ${type}`) //TODO: check specifically for data step types?

    return { type : type, dataflow: toID(dataFlow), message : (message || NULL_MESSAGE)}
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

    let ret = Object.assign(newModelObject(flowID(type,from,to,message)),{
        type : type, 
        from : from,
        to : to,
        text : (message || NULL_MESSAGE)
    })
    return ret;
}

function newActor(type,id,caption,note = "", annotations = [])
{
    return Object.assign(newModelObject(id), { 
        type : type, 
        caption : caption,
        note : note,
        annotations : annotations
    })
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


/**
 * Creates a new container object with the given ID, name, and contained objects.
 * @param {String} id The unique identifier for this container
 * @param {String} name The name of the container
 * @param {String[]} actors Array of actor objects contained in this container
 * @param {String[]} channels Array of channel objects contained in this container
 * @param {String[]} dataFlows Array of data flow objects contained in this container
 * @param {String[]} annotations Array of annotation objects contained in this container
 * @param {String[]} containers Array of container objects contained in this container
 * 
 * @returns The new container object
 */
function newContainer(id, name, actors,channels,dataFlows, annotations, containers)
{
    let ret = Object.assign(newModelObject(id), {
        name : (name || id),
        actors : (actors.map(toID) || []),
        channels : (channels.map(toID) || []),
        dataFlows : (dataFlows.map(toID) || []),
        annotations : (annotations.map(toID) || []),
        containers : (containers.map(toID) ||[])
    })
    //NOTE: this assumes that the 'assignContainerTo' function changes the model objects in place
    if (actors) actors.forEach(a => assignContainerTo(a,ret))
    if (channels) channels.forEach(c => assignContainerTo(c,ret))
    if (dataFlows) dataFlows.forEach(df => assignContainerTo(df,ret))
    if (annotations) annotations.forEach(a => assignContainerTo(a,ret))
    if (containers) containers.forEach(c => assignContainerTo(c,ret))
    return ret;
}

function newModelObject(id)
{
    if (!id) throw new Error("Invalid id for model object")
    let ret = {}
    ret[ID_KEY] = id
    return ret;
}

/**
 * Tests whether the given object is a valid container object.
 * @param {Object} obj The object to test
 * @returns TRUE iff the object is a valid container object
 * @see newContainer
 */
function isContainer(obj)
{
    if (!obj) return false;
    if (!obj[ID_KEY] || !obj.name || !obj.actors || !obj.channels || !obj.dataFlows || !obj.annotations || !obj.containers)
        return false;
    return true;
}

/**
 * Assigns the given container to the given model object
 * Changes the model object in place.
 * @param {Object} modelObj The model object to assign the container to
 * @param {Object} container The container to assign to the model object
 * @returns The model object with the container assigned
 */
function assignContainerTo(modelObj,container)
{ 
    if (!modelObj) throw new Error("Invalid model object when assigning container")
    if (!isContainer(container)) throw new Error("Invalid container when assigning container")
    modelObj[CONTAINER_KEY] = toID(container)
    return modelObj;
}

function isModelObjectContainedIn(modelObj,container)
{
    if (!modelObj || !container) return false;
    return modelObj[CONTAINER_KEY] === toID(container)
}

function getContainedActors(system,container)
{
    return system.actors.filter(a => isModelObjectContainedIn(a,container))
}

function getContainedChannels(system,container)
{
    return system.channels.filter(c => isModelObjectContainedIn(c,container))
}

function getContainedContainers(system,container)
{
    return Object.values(system.containers).filter(c => isModelObjectContainedIn(c,container))
}

function isTopLevelObject(modelObj)
{
    if (!modelObj) return false;
    return !modelObj[CONTAINER_KEY]
}

/**
 * Creates a new annoation object with the given id.
 * @param {String} id The id of the annotation
 * @param {Object[]} properties A list of key value pairs (as object), to assign for the annotation object
 * @returns The new annotation object
 */
function newAnnotation(id,properties)
{
    return Object.assign(newModelObject(id),...properties)
}

function resolveAnnotations(model)
{
    model.actors.forEach(actor => {
        actor.annotations.map(aID => model.annotations[aID])
                         .filter(ad => ad !== undefined)
                         .forEach(ad => {
                            // Only assign properties that don't exist in actor
                            Object.keys(ad).forEach(key => {
                                if (!(key in actor)) {
                                    actor[key] = ad[key];
                                }
                            });
                         })
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
    isContainer,
    isActor,
    isChannel,
    isDataFlow,
    isAnnotation,
    newAnnotation,
    toID, ID_KEY,
    isModelObjectContainedIn,
    isTopLevelObject,
    getContainedActors,
    getContainedChannels,
    getContainedContainers,
    assignContainerTo,
    newModelObject,
    CONTAINER_KEY
}