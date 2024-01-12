const assert = require('assert')
const { channelID, newChannel, CHANNEL_TYPE, newActor,ACTOR_TYPE, newSystemModel  } = require('../src/SystemModel')
const { outgoingChannelEdgeID, incomingChannelEdgeID, channelIDFromEdgeID} = require('../src/diagram/DiagramModel')

describe("Model Classes", function() {
    it("Channel ID implementation is synchronized with model edge ID implementation", function() {
        let channel = newChannel(CHANNEL_TYPE.REQ_RES,
                            newActor(ACTOR_TYPE.AGENT,"a","A"),
                            newActor(ACTOR_TYPE.AGENT,"b","B")
                        )
        let cid = channelID(channel)

        assert.strictEqual(channelIDFromEdgeID(incomingChannelEdgeID(channel)),cid)
        assert.strictEqual(channelIDFromEdgeID(outgoingChannelEdgeID(channel)),cid)        
    })

    it("Model object has expected keys with correct values",function() {
        let actors = [newActor(ACTOR_TYPE.AGENT,"a","A"), newActor(ACTOR_TYPE.AGENT,"b","B")]
        let channels = [newChannel(CHANNEL_TYPE.REQ_RES,actors[0],actors[1])]
        let dfs = []
        let scenarios = []
        let annotations = []

        let m = newSystemModel(actors,channels,dfs,scenarios,annotations)

        assert.deepStrictEqual(m.actors,actors)
        assert.deepStrictEqual(m.channels,channels)
        assert.deepStrictEqual(m.data_flows,dfs)
        assert.deepStrictEqual(m.scenarios,scenarios)
        assert.deepStrictEqual(m.annotations,annotations)

    })
})