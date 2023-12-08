const _ohm = require('ohm-js')
const ohm = _ohm.default || _ohm; //workaround to allow importing using common js in node (for testing), and packing w/ webpack.

const { ACTOR_TYPE, DATA_FLOW_TYPE, CHANNEL_TYPE,
        newChannel, newStep, SCENARIO_STEP_TYPE,
        newDataFlow, newDataFlowStep } = require('../SystemModel')


function createGrammarNS()
{
    return ohm.createNamespace({BaseGrammar : ohm.grammar(loadGrammarSource())})
}

function loadGrammarSource()
{
    let grammarText = require(`./scenaria.ohm.js`).grammar
    return grammarText;
}

function resolveGrammar()
{
    let ns = createGrammarNS()
    return ohm.grammar(loadGrammarSource(),ns)
}

function createParser()
{
    const lang = resolveGrammar();
    let irBuilder = lang.createSemantics();

    let agentsParsed = {}
    let storesParsed = {}
    let channelsParsed = {}
    let flowsParsed = {}

    function isValidDataFlow(agentID,storeID)
    {

        let isValidAgent = (agentsParsed[agentID] && agentsParsed[agentID].type) == ACTOR_TYPE.AGENT
        let isValidStore = (storesParsed[storeID] && storesParsed[storeID].type) == ACTOR_TYPE.STORE

        return isValidAgent && isValidStore
    }

    function isValidChannel(fromID,toID)
    {
        let isValidFrom = [ACTOR_TYPE.AGENT,ACTOR_TYPE.USER].includes((agentsParsed[fromID] && agentsParsed[fromID].type))
        let isValidTo = [ACTOR_TYPE.AGENT,ACTOR_TYPE.USER].includes((agentsParsed[toID] && agentsParsed[toID].type))

        return isValidFrom && isValidTo
    }

    function rememberChannel(channelObj)
    {
        channelsParsed[channelObj.id] = channelObj
    }

    function channelDefined(channelObj)
    {
        return typeof(channelsParsed[channelObj.id]) != 'undefined'
    }
    
    function isScenario(o) { return o.steps !== undefined }

    function rememberDataFlow(flowObj) { if (flowObj) flowsParsed[flowObj.id] = flowObj }
    function flowDefined(flowObj) { return flowsParsed[flowObj.id] !== undefined }


    irBuilder.addOperation("asIR()", {

        Program(programElements) {

            let definedElements = programElements.asIR();
            let actors = definedElements.filter(el => Object.values(ACTOR_TYPE).includes(el.type))
            // let dataFlows = definedElements.filter(el => Object.values(DATA_FLOW_TYPE).includes(el.type))
            let dataFlows = Object.values(flowsParsed)
            let channels = Object.values(channelsParsed)

            let scenarios = definedElements.filter(el => isScenario(el))

            let p = {
                "name" : "",
                actors : actors,
                channels : channels,
                data_flows : dataFlows,
                scenarios : scenarios
            }
            
            return [p]
        },

        Statement(c) {
            return c.asIR();
        },

        SingleStatement(c,_)
        {
            return c.asIR();
        },

        ProgramElements (maybeFirstElement, restOfElements)
        {
            let first = maybeFirstElement.children.length > 0 ? maybeFirstElement.children[0].asIR() : []
            let otherElements = restOfElements.children.flatMap(e => e.asIR())
            return first.concat(otherElements)
        },

        ProgramElement(prgEl) {
            return prgEl.asIR();
        },

        comment(_,text) {
            return [text.sourceString]
        },

        ActorDef(_, caption, __, id) {
            let a = { type : ACTOR_TYPE.AGENT, id : id.asIR()[0], caption : caption.asIR()[0]}
            agentsParsed[a.id] = a
            return [a]
        },

        StoreDef(_, caption, __, id) {
            let s = {type : ACTOR_TYPE.STORE, id : id.asIR()[0], caption : caption.asIR()[0] }
            storesParsed[s.id] = s
            return [s]
        },

        UserDef(_,caption,__,id) {
            let u = {type : ACTOR_TYPE.USER, id : id.asIR()[0], caption : caption.asIR()[0] }
            agentsParsed[u.id] = u;
            return [u]
        },

        ReqResChannel(_, maybeText, __) {
            let channelText = maybeText.children.length > 0 ? 
                                maybeText.sourceString
                                : "";
            return [channelText]

        },

        SyncCall(fromID,channelT,toID) {
            let from = fromID.asIR()[0]
            let to = toID.asIR()[0]
            let channelText = channelT.asIR()[0]
            if (!isValidChannel(from,to))
                throw new Error(`Invalid channel definition: ${from} -(${channelText})-> ${to}`)
            //should avoid more than one channel between same agents?
            let channel = newChannel(CHANNEL_TYPE.REQ_RES,from,to,channelText)
            rememberChannel(channel)
            return [channel]
        },

        AsynchChannel(_, maybeText, __) {
            let channelText = maybeText.children.length > 0 ? 
                                maybeText.sourceString
                                : "";
            return [channelText]
        },

        AsynchCall(fromID,channelT,toID) {
            let from = fromID.asIR()[0]
            let to = toID.asIR()[0]
            let channelText = channelT.asIR()[0]
            if (!isValidChannel(from,to))
                throw new Error(`Invalid channel definition: ${from} -(${channelText})-\ ${to}`)

            let channel = newChannel(CHANNEL_TYPE.REQ_RES,from,to,channelText)
            rememberChannel(channel)
            return [channel]
    
        },

        Scenario(name,_,steps,__) {
            let _steps = steps.children.flatMap(s => s.asIR())
            return [{name : name.asIR()[0], steps : _steps}]
        },

        SyncCallStep(fromID, _, message, __ , toID) {
            let from = fromID.asIR()[0]
            let to = toID.asIR()[0]
            let msgText = message.asIR()[0]

            //lazily define the channel object if not defined, and then return the step object
            let channel = newChannel(CHANNEL_TYPE.REQ_RES,from,to)
            if (!channelDefined(channel))
                rememberChannel(channel)

            let step = newStep(channelsParsed[channel.id],SCENARIO_STEP_TYPE.REQ,msgText)
            return [step]
        },

        AsynchCallStep(fromID, _, message,__,toID) {
            let from = fromID.asIR()[0]
            let to = toID.asIR()[0]
            let msgText = message.asIR()[0]

            //lazily define the channel object if not defined, and then return the step object
            let channel = newChannel(CHANNEL_TYPE.ASYNC,from,to)
            if (!channelDefined(channel))
                rememberChannel(channel)

            let step = newStep(channelsParsed[channel.id],SCENARIO_STEP_TYPE.REQ,msgText)
            return [step]
        },

        SyncResponse(callerID,_,msg,__,responderID) {
            let caller = callerID.asIR()[0]
            let msgText = msg.asIR()[0]
            let responder = responderID.asIR()[0]

            let channel = newChannel(CHANNEL_TYPE.REQ_RES,caller,responder)
            if (!channelDefined) throw new Error(`Channel undefined for response step: ${caller} -(${msgText}-< ${responder})`)

            let step = newStep(channelsParsed[channel.id],SCENARIO_STEP_TYPE.RES,msgText)
            return [step]
        },

        DataWrite(writerID,_,msg,__,storeID) {
            let writer = writerID.asIR()[0]
            let msgText = msg.asIR()[0]
            let store = storeID.asIR()[0]

            let dataFlow = newDataFlow(DATA_FLOW_TYPE.WRITE,writer,store)
            if (!flowDefined(dataFlow))
                rememberDataFlow(dataFlow)
            
            let step = newDataFlowStep(dataFlow, SCENARIO_STEP_TYPE.DATA_WRITE, msgText)
            return [step]

        },

        //TODO: 
        //  1. generate id for data flows id (newDataFlow in SystemModel)
        //  2. generate edges (data flows) lazily in scenarios
        //  3. support data writes/reads in scenario executer
        DataFlowWrite(agentID,_,storeID) {
            let aid = agentID.asIR()[0]
            let sid = storeID.asIR()[0]
            if (!isValidDataFlow(aid,sid))
                throw new Error(`Invalid write data flow: ${aid} --> ${sid}`)
            
            let flow = newDataFlow(DATA_FLOW_TYPE.WRITE,aid,sid)
            rememberDataFlow(flow)
            return [flow]
        },

        DataFlowRead(agentID,_,storeID) {
            let aid = agentID.asIR()[0]
            let sid = storeID.asIR()[0]
            if (!isValidDataFlow(aid,sid))
                throw new Error(`Invalid read data flow: ${aid} <-- ${sid}`)
            let flow = newDataFlow(DATA_FLOW_TYPE.READ,sid,aid)
            rememberDataFlow(flow)
            return [flow]
        },

        TextLiteral(_,s,__) {
            return [s.sourceString]
        },
        
        full_ident(firstChar,restOfChars) {
            let identifier = firstChar.sourceString + restOfChars.sourceString
            return [identifier]
        },

        _iter(...commands) {
            return commands.flatMap(c => c.asIR())
        },

        _terminal() {
            return [this.sourceString]
        }

        

    })

    return (programText) => {
        let m = lang.match(programText);
        if (m.succeeded())
            return irBuilder(m).asIR()[0]; //the single element should be the model
        else
            throw new Error(`Failed to parse program: ${m.message}`)
    }
}

module.exports = {
    createParser
}

