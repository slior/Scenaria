const { graphNodeRepresentsAnActor,getContainedEdges } = require('../src/diagram/DiagDraw');
const { newActor,newChannel, newContainer,ACTOR_TYPE, CHANNEL_TYPE,
        newDataFlow, newSystemModel, DATA_FLOW_TYPE, EDGE_TYPE
        } = require('../src/SystemModel')

describe("Graph node type detection", function() {
    it("should correctly identify actors and non-actors in graph nodes", function() {
        // Setup
        const actor = newActor(ACTOR_TYPE.AGENT, "actor1", "Test Actor");
        const channel = newChannel(CHANNEL_TYPE.ASYNC, "from", "to");
        const container = newContainer("container1", "Test Container", [], [], [], [], []);

        // Assert
        graphNodeRepresentsAnActor(actor).should.be.true();
        graphNodeRepresentsAnActor(channel).should.be.false();
        graphNodeRepresentsAnActor(container).should.be.false();
    });

    it("should handle different types of actors", function() {
        // Setup
        const agent = newActor(ACTOR_TYPE.AGENT, "agent1", "Test Agent");
        const user = newActor(ACTOR_TYPE.USER, "user1", "Test User");
        const store = newActor(ACTOR_TYPE.STORE, "store1", "Test Store");

        // Assert
        graphNodeRepresentsAnActor(agent).should.be.true();
        graphNodeRepresentsAnActor(user).should.be.true();
        graphNodeRepresentsAnActor(store).should.be.true();
    });

    it("should handle null and undefined inputs", function() {
        // Assert
        should(graphNodeRepresentsAnActor(null)).be.false();
        should(graphNodeRepresentsAnActor(undefined)).be.false();
        should(graphNodeRepresentsAnActor({})).be.false();
    });
});


describe("Container edge retrieval", function() {
    it("should get all edges contained in a container", function() {
        // Setup
        const actor1 = newActor(ACTOR_TYPE.AGENT, "a1", "Actor 1");
        const actor2 = newActor(ACTOR_TYPE.AGENT, "a2", "Actor 2");
        const channel = newChannel(CHANNEL_TYPE.ASYNC, "a1", "a2");
        const dataFlow = newDataFlow(DATA_FLOW_TYPE.READ, "a1", "a2");
        
        const container = newContainer("cont1", "Container 1", 
            [actor1, actor2], [channel], [dataFlow], [], []);

        const system = newSystemModel(
            [actor1, actor2],    // actors
            [channel],           // channels
            [dataFlow],          // dataFlows
            [],                  // scenarios
            {},                  // annotations
            { "cont1": container }  // containers
        );

        // Act
        const edges = getContainedEdges(system, container);

        // Assert
        edges.should.have.length(3); // 2 for channel (in/out) + 1 for data flow
        
        // Check channel edges
        const channelEdges = edges.filter(e => e.type === "channel");
        channelEdges.should.have.length(2);
        channelEdges[0].sources.should.containEql("a1");
        channelEdges[1].targets.should.containEql("a2");

        // Check data flow edge
        const dataFlowEdge = edges.find(e => e.type === EDGE_TYPE.DATA_FLOW);
        should.exist(dataFlowEdge);
        dataFlowEdge.sources.should.containEql("a1");
        dataFlowEdge.targets.should.containEql("a2");
    });

    it("should return empty array for container with no edges", function() {
        // Setup
        const container = newContainer("cont1", "Container 1", [], [], [], [], []);
        const system = newSystemModel(
            [],    // actors
            [],    // channels
            [],    // dataFlows
            [],    // scenarios
            {},    // annotations
            { "cont1": container }  // containers
        );

        // Act
        const edges = getContainedEdges(system, container);

        // Assert
        edges.should.be.empty();
    });

    it("should handle null and undefined inputs", function() {
        // Setup
        const system = newSystemModel([], [], [], [], {}, {});
        
        // Act & Assert
        (() => getContainedEdges(null, {})).should.throw();
        (() => getContainedEdges(system, null)).should.throw();
        (() => getContainedEdges(undefined, {})).should.throw();
        (() => getContainedEdges(system, undefined)).should.throw();
    });
});