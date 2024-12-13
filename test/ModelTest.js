const assert = require('assert')
const { channelID, newChannel, CHANNEL_TYPE,
        newActor,ACTOR_TYPE, newSystemModel,
        isActor, newDataFlow, DATA_FLOW_TYPE,
        isChannel, isDataFlow, isAnnotation, isContainer,
        newAnnotation, newAnnotationDefElement, ANNOTATION_KEY, 
        newContainer,ID_KEY,toID, 
        resolveAnnotations, CONTAINER_KEY, assignContainerTo,
        newModelObject, isModelObjectContainedIn, isTopLevelObject } = require('../src/SystemModel')

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
                    caption : "A",
                    note : "",
                    annotations : []
                }
        a[ID_KEY] = "a"
        assert.deepStrictEqual(actors[0],a)
        let b = { type : ACTOR_TYPE.AGENT, 
                    caption : "B",
                    note : "",
                    annotations : []
                }
        b[ID_KEY] = "b"
        assert.deepStrictEqual(actors[1],b)

        let channel = newChannel(CHANNEL_TYPE.REQ_RES,toID(a),toID(b),"test channel")
        let chnl = {type : CHANNEL_TYPE.REQ_RES,from : toID(a), to : toID(b), text : "test channel" }
        chnl[ID_KEY] = channelID(chnl)
        assert.deepStrictEqual(channel,chnl)
    })

    it("Identifies an actor object correctly",function() {
        let a = newActor(ACTOR_TYPE.AGENT,"a","A")
        isActor(a).should.be.true()

        let s = newActor(ACTOR_TYPE.STORE,"s","S")
        isActor(s).should.be.true()

        let df = newDataFlow(DATA_FLOW_TYPE.READ,s,a)
        isActor(df).should.be.false()

        let c = newChannel(CHANNEL_TYPE.ASYNC,toID(a),toID(s))
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

        let at = newAnnotation('annot',[newAnnotationDefElement(ANNOTATION_KEY.COLOR,'green')])
        isAnnotation(at).should.be.true()

        should(isAnnotation(null)).be.false()
        should(isAnnotation(undefined)).be.false()
        should(isAnnotation({})).be.false()
    })

    it("Identifies a container correctly", function() {
        let a = newActor(ACTOR_TYPE.AGENT,"a","A")

        isContainer(a).should.be.false()

        let s = newActor(ACTOR_TYPE.STORE,"s","S")
        isContainer(s).should.be.false()

        let df = newDataFlow(DATA_FLOW_TYPE.READ,s,a)
        isContainer(df).should.be.false()
        
        let c = newChannel(CHANNEL_TYPE.ASYNC,"a","b")
        isContainer(c).should.be.false()

        let at = newAnnotation('annot',[newAnnotationDefElement(ANNOTATION_KEY.COLOR,'green')])
        isContainer(at).should.be.false()

        let cont = newContainer('c','The Container',[a,s],[c],[df],[at],[])
        isContainer(cont).should.be.true()

        should(isContainer(null)).be.false()
        should(isContainer(undefined)).be.false()
        should(isContainer({})).be.false()
    })
})

describe("Annotation resolution", function() {
    it('should not override existing actor properties with annotation properties', () => {
        // Setup
        const actorId = 'actor1';
        const annotationId = 'annotation1';
        const actor = newActor(ACTOR_TYPE.AGENT, actorId, 'Test Actor', 'note', [annotationId]);
        actor.existingProperty = 'original value';
        
        const annotation = newAnnotation(annotationId, [
            { existingProperty: 'new value' },
            { newProperty: 'added value' }
        ]);

        const model = newSystemModel(
            [actor],           // actors
            [],               // channels
            [],               // dataFlows
            [],               // scenarios
            { [annotationId]: annotation }  // annotations
        );

        // Act
        resolveAnnotations(model);

        // Assert
        model.actors[0].existingProperty.should.equal('original value');  // Should keep original value
        model.actors[0].newProperty.should.equal('added value');         // Should add new property

    });
})

describe("Container assignment", function()
{
    it("should assign container to model object correctly", function()
    {

        const containerId = "container1";
        const modelObjId = "model1";
        const modelObj = newActor(ACTOR_TYPE.AGENT,modelObjId,"Test Actor") 
        const container = newContainer(containerId, "Test Container", [modelObj], [], [], [], []);

        modelObj[CONTAINER_KEY].should.equal(toID(container));
    });

    it("should throw error when assigning invalid container", function()
    {
        
        const modelObj = newModelObject("model1");
        const invalidContainer = { _id: "container1" }; // Missing required container properties

        (() => assignContainerTo(modelObj, invalidContainer))
            .should.throw(/Invalid container when assigning container/);
    });

    it("should throw error when assigning to invalid model object", function()
    {
        
        const container = newContainer("container1", "Test Container", [], [], [], [], []);

        (() => assignContainerTo(null, container))
            .should.throw(/Invalid model object when assigning container/);
        (() => assignContainerTo(undefined, container))
            .should.throw(/Invalid model object when assigning container/);
    });

    it("should handle container ID conversion correctly", function()
    {
        
        const containerId = "container1";
        const modelObjId = "model1";
        const container = { _id: containerId, name: "Test Container", 
                          actors: [], channels: [], dataFlows: [], 
                          annotations: [], containers: [] };
        const modelObj = newModelObject(modelObjId);
        
        assignContainerTo(modelObj, container);

        modelObj[CONTAINER_KEY].should.equal(containerId);
    });
})

describe("Model object containment", function()
{
    it("should return true when model object is contained in container", function()
    {

        const containerId = "container1";
        const modelObjId = "model1";
        const modelObj = newActor(ACTOR_TYPE.AGENT,modelObjId,"Test Actor")
        const container = newContainer(containerId, "Test Container", [modelObj], [], [], [], []);
        
        isModelObjectContainedIn(modelObj, container).should.be.true();
    });

    it("should return false when model object is not contained in container", function()
    {
        
        const containerId = "container1";
        const modelObjId = "model1";
        const modelObj = newModelObject(modelObjId);
        const container = newContainer(containerId, "Test Container", [], [], [], [], []);

        isModelObjectContainedIn(modelObj, container).should.be.false();
    });

    it("should return false for null or undefined inputs", function()
    {

        const container = newContainer("container1", "Test Container", [], [], [], [], []);
        const modelObj = newModelObject("model1");

        isModelObjectContainedIn(null, container).should.be.false();
        isModelObjectContainedIn(undefined, container).should.be.false();
        isModelObjectContainedIn(modelObj, null).should.be.false();
        isModelObjectContainedIn(modelObj, undefined).should.be.false();
    });

    it("should handle different types of model objects correctly", function()
    {
        const actor = newActor(ACTOR_TYPE.AGENT, "actor1", "Test Actor");
        const channel = newChannel(CHANNEL_TYPE.ASYNC, "from", "to");
        const dataFlow = newDataFlow(DATA_FLOW_TYPE.READ, "source", "target");
        const annotation = newAnnotation("annot1", [newAnnotationDefElement(ANNOTATION_KEY.COLOR, "red")]);
        
        const container = newContainer("container1", "Test Container", [actor], [channel], [dataFlow], [annotation], []);

        // Assert
        isModelObjectContainedIn(actor, container).should.be.true();
        isModelObjectContainedIn(channel, container).should.be.true();
        isModelObjectContainedIn(dataFlow, container).should.be.true();
        isModelObjectContainedIn(annotation, container).should.be.true();
    });
})

describe("Top level object detection", function()
{
    it("should return true for objects not assigned to any container", function()
    {
        const modelObj = newModelObject("model1");

        isTopLevelObject(modelObj).should.be.true();
    });

    it("should return false for objects assigned to a container", function()
    {
        const modelObj = newActor(ACTOR_TYPE.AGENT,"model1","Test Actor")
        const container = newContainer("container1", "Test Container", [modelObj], [], [], [], []);

        isTopLevelObject(modelObj).should.be.false();
    });

    it("should handle different types of model objects correctly", function() 
    {
        const actor = newActor(ACTOR_TYPE.AGENT, "actor1", "Test Actor");
        const channel = newChannel(CHANNEL_TYPE.ASYNC, "from", "to");
        const dataFlow = newDataFlow(DATA_FLOW_TYPE.READ, "source", "target");
        const annotation = newAnnotation("annot1", [newAnnotationDefElement(ANNOTATION_KEY.COLOR, "red")]);
        
        // Initially all objects should be top level
        isTopLevelObject(actor).should.be.true();
        isTopLevelObject(channel).should.be.true();
        isTopLevelObject(dataFlow).should.be.true();
        isTopLevelObject(annotation).should.be.true();

        // After assigning to container, they should not be top level
        const container = newContainer("container1", "Test Container", 
            [actor], [channel], [dataFlow], [annotation], []);

        isTopLevelObject(actor).should.be.false();
        isTopLevelObject(channel).should.be.false();
        isTopLevelObject(dataFlow).should.be.false();
        isTopLevelObject(annotation).should.be.false();
    });

    it("should handle null and undefined inputs", function()
    {
        isTopLevelObject(null).should.be.false();
        isTopLevelObject(undefined).should.be.false();
        isTopLevelObject({}).should.be.true();  // Empty object has no container
    });
});