const assert = require('assert')
const { channelID, newChannel, CHANNEL_TYPE, newActor,ACTOR_TYPE, newSystemModel, isActor, newDataFlow, DATA_FLOW_TYPE, isChannel, isDataFlow, isAnnotation  } = require('../src/SystemModel')
const { outgoingChannelEdgeID, incomingChannelEdgeID, channelIDFromEdgeID} = require('../src/diagram/DiagramModel')
const should = require('should')

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

    it("Maintains interface of model objects",function() {
        let actors = [newActor(ACTOR_TYPE.AGENT,"a","A"), newActor(ACTOR_TYPE.AGENT,"b","B")]
        let a = { type : ACTOR_TYPE.AGENT, 
                    id : "a",
                    caption : "A",
                    note : "",
                    annotations : []
                }
        assert.deepStrictEqual(actors[0],a)
        let b = { type : ACTOR_TYPE.AGENT, 
                    id : "b",
                    caption : "B",
                    note : "",
                    annotations : []
                }
        assert.deepStrictEqual(actors[1],b)

        let channel = newChannel(CHANNEL_TYPE.REQ_RES,a.id,b.id,"test channel")
        let chnl = {type : CHANNEL_TYPE.REQ_RES,from : a.id, to : b.id, text : "test channel" }
        chnl.id = channelID(chnl)
        assert.deepStrictEqual(channel,chnl)
    })

    it("Identifies an actor object correctly",function() {
        let a = newActor(ACTOR_TYPE.AGENT,"a","A")
        isActor(a).should.be.true()

        let s = newActor(ACTOR_TYPE.STORE,"s","S")
        isActor(s).should.be.true()

        let df = newDataFlow(DATA_FLOW_TYPE.READ,s,a)
        isActor(df).should.be.false()

        let c = newChannel(CHANNEL_TYPE.ASYNC,a.id,s.id)
        isActor(c).should.be.false()

        should(isActor(null)).be.null()
        should(isActor(undefined)).be.undefined()
        should(isActor({})).be.undefined()
    })

    it("Identifies a channel object correctly",function() {
        let a = newActor(ACTOR_TYPE.AGENT,"a","A")

        isChannel(a).should.be.false()

        let s = newActor(ACTOR_TYPE.STORE,"s","S")
        isChannel(s).should.be.false()

        let df = newDataFlow(DATA_FLOW_TYPE.READ,s,a)
        isChannel(df).should.be.false()

        let c = newChannel(CHANNEL_TYPE.ASYNC,"a","b")
        isChannel(c).should.be.true()

        should(isChannel(null)).be.null()
        should(isChannel(undefined)).be.undefined()
        should(isChannel({})).be.undefined()
    })

    it("Identifies a data flow object correctly", function() {
        let a = newActor(ACTOR_TYPE.AGENT,"a","A")

        isDataFlow(a).should.be.false()

        let s = newActor(ACTOR_TYPE.STORE,"s","S")
        isDataFlow(s).should.be.false()

        let df = newDataFlow(DATA_FLOW_TYPE.READ,s,a)
        isDataFlow(df).should.be.true()
        let df2 = newDataFlow(DATA_FLOW_TYPE.WRITE,s,a)
        isDataFlow(df2).should.be.true()

        let c = newChannel(CHANNEL_TYPE.ASYNC,"a","b")
        isDataFlow(c).should.be.false()

        should(isDataFlow(null)).be.null()
        should(isDataFlow(undefined)).be.undefined()
        should(isDataFlow({})).be.undefined()
    })

    it("Identifies an annotation correctly",function() {
        let a = newActor(ACTOR_TYPE.AGENT,"a","A")

        isAnnotation(a).should.be.false()

        let s = newActor(ACTOR_TYPE.STORE,"s","S")
        isAnnotation(s).should.be.false()

        let df = newDataFlow(DATA_FLOW_TYPE.READ,s,a)
        isAnnotation(df).should.be.false()
        
        let c = newChannel(CHANNEL_TYPE.ASYNC,"a","b")
        isAnnotation(c).should.be.false()

        should(isAnnotation(null)).be.false()
        should(isAnnotation(undefined)).be.false()
        should(isAnnotation({})).be.false()
    })
})