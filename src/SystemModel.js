
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

function channelID(channel)
{
    return `${channel.from}-${channel.to}-${channel.type.toString()}` 
}

module.exports = {
    EDGE_TYPE,
    ACTOR_TYPE,
    CHANNEL_TYPE,
    channelID,
    DATA_FLOW_TYPE
}