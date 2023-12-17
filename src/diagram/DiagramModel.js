
const { channelID} = require('../SystemModel')

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

function channelIDFromEdgeID(edgeID)
{
    var channelID = '';
    switch (true)
    {
        case edgeID.indexOf(CHANNEL_EDGE_INCOMING_DELIM) > 0 : 
            channelID = edgeID.split(CHANNEL_EDGE_INCOMING_DELIM)[1]
            break;
        case edgeID.indexOf(CHANNEL_EDGE_OUTGOING_DELIM) > 0 : 
            channelID = edgeID.split(CHANNEL_EDGE_OUTGOING_DELIM)[0]
            break;
        //return empty string by default
    }
    return channelID
}

module.exports = {
    incomingChannelEdgeID,
    outgoingChannelEdgeID,
    channelIDFromEdgeID
}