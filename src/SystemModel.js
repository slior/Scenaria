
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
    RES : 'res'
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
    if (!Object.values(SCENARIO_STEP_TYPE).includes(type)) throw new Error(`Invalid step type: ${type}`)

    return { type : type, message : (message || NULL_MESSAGE), channel : channel.id}

}

module.exports = {
    EDGE_TYPE,
    ACTOR_TYPE,
    CHANNEL_TYPE,
    channelID,
    DATA_FLOW_TYPE,
    newChannel,
    newStep,
    SCENARIO_STEP_TYPE
}