const _ohm = require('ohm-js')
const ohm = _ohm.default || _ohm; //workaround to allow importing using common js in node (for testing), and packing w/ webpack.

const { ACTOR_TYPE, DATA_FLOW_TYPE, CHANNEL_TYPE,
        newChannel, newStep, SCENARIO_STEP_TYPE,
        newDataFlow, newDataFlowStep, newActor } = require('../SystemModel')


function createGrammarNS()
{
    return ohm.createNamespace({BaseGrammar : ohm.grammar(loadGrammarSource())})
}

function loadGrammarSource()
{
    let grammarText = require(`./scenaria.ohm.js`).grammar
    return grammarText;
}

function getLanguageKeywords()
{
    return Object.values(require(`./scenaria.ohm.js`).KEYWORDS)
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

    //maintain state of parsed elements
    let agentsParsed = {}
    let storesParsed = {}
    let channelsParsed = {}
    let flowsParsed = {}

    //Helper functions for parsing
    function isValidDataFlow(type,from,to)
    {
        let agentID = type == DATA_FLOW_TYPE.READ ? to : from;
        let storeID = type == DATA_FLOW_TYPE.READ ? from : to;

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

    function rememberAgent(agentObj) { agentsParsed[agentObj.id] = agentObj }
    function rememberStore(storeObj) { storesParsed[storeObj.id] = storeObj }

    function rememberChannel(channelObj) { channelsParsed[channelObj.id] = channelObj }
    function channelDefined(channelObj)
    { //it's defined if we already saw that channel, and it's of the same type.
        return typeof(channelsParsed[channelObj.id]) != 'undefined' 
                && channelObj.type == channelsParsed[channelObj.id].type
    }
    
    function isScenario(o) { return o.steps !== undefined }

    function rememberDataFlow(flowObj) { if (flowObj) flowsParsed[flowObj.id] = flowObj }
    function flowDefined(flowObj) 
    { 
        return flowsParsed[flowObj.id] !== undefined 
                && flowObj.type == flowsParsed[flowObj.id].type
    }

    function parseChannel(type,fromID, toID, channelT)
    {
        let from = fromID.asIR()[0]
        let to = toID.asIR()[0]
        let channelText = channelT.asIR()[0]
        if (!isValidChannel(from,to))
            throw new Error(`Invalid channel definition: ${from} -(${channelText})- ${to}`)
        //should avoid more than one channel between same agents?
        let channel = newChannel(type,from,to,channelText)
        rememberChannel(channel)
        return [channel]
    }

    function parseChannelStep(channelType,stepType,fromID,toID,msg)
    {
        let from = fromID.asIR()[0]
        let to = toID.asIR()[0]
        let msgText = msg.asIR()[0]

        //lazily define the channel object if not defined, and then return the step object
        let channel = newChannel(channelType,from,to)
        if (!channelDefined(channel))
            rememberChannel(channel)

        let step = newStep(channelsParsed[channel.id],stepType,msgText)
        return [step]
    }

    function parseFlowStep(dataFlowType,stepType,fromID,toID,msg)
    {
        let from = fromID.asIR()[0]
        let msgText = msg.asIR()[0]
        let to = toID.asIR()[0]

        let dataFlow = newDataFlow(dataFlowType,from,to)
        if (!flowDefined(dataFlow))
            rememberDataFlow(dataFlow)
        
        let step = newDataFlowStep(dataFlow, stepType, msgText)
        return [step]
    }

    function parseDataFlow(dataFlowType,fromID,toID)
    {
        let from = fromID.asIR()[0]
        let to = toID.asIR()[0]
        if (!isValidDataFlow(dataFlowType,from,to))
            throw new Error(`Invalid data flow: ${from} -- ${to}`)
        
        let flow = newDataFlow(dataFlowType,from,to)
        rememberDataFlow(flow)
        return [flow]
    }

    ///Definition of parsing itself - turning tokens into intermediate representation
    irBuilder.addOperation("asIR()", {

        Program(programElements) {

            let definedElements = programElements.asIR();
            let actors = Object.values(agentsParsed)
                        .concat(Object.values(storesParsed))
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

        AgentDef(_, caption, __, id) {
            let a = newActor(ACTOR_TYPE.AGENT,id.asIR()[0],caption.asIR()[0])
            rememberAgent(a)
            return [a]
        },

        StoreDef(_, caption, __, id) {
            let s = newActor(ACTOR_TYPE.STORE,id.asIR()[0], caption.asIR()[0])
            rememberStore(s)
            return [s]
        },

        UserDef(_,caption,__,id) {
            let u = newActor(ACTOR_TYPE.USER,id.asIR()[0],caption.asIR()[0])
            rememberAgent(u)
            return [u]
        },

        Note(_,__,elementID,___,textLiteral) {
            let elID = elementID.asIR()[0]
            let text = textLiteral.asIR()[0]
            if (agentsParsed[elID])
                agentsParsed[elID].note = text;
            else if (storesParsed[elID])
                storesParsed[elID].note = text;
            else throw new Error(`Unrecognized id for note: ${elID}`)
            return []
        },

        ReqResChannel(_,__, maybeText,___, ____) {
            let channelText = maybeText.children.length > 0 ? 
                                maybeText.asIR()[0]
                                : "";
            return [channelText]

        },

        SyncCall(fromID,channelT,toID) {
            return parseChannel(CHANNEL_TYPE.REQ_RES,fromID,toID,channelT)
        },

        AsynchChannel(_,__, maybeText,___, ____) {
            let channelText = maybeText.children.length > 0 ? 
                                maybeText.asIR()[0]
                                : "";
            return [channelText]
        },

        AsynchCall(fromID,channelT,toID) {
            return parseChannel(CHANNEL_TYPE.ASYNC,fromID,toID,channelT)
        },

        Scenario(name,_,steps,__) {
            let _steps = steps.children.flatMap(s => s.asIR())
            return [{name : name.asIR()[0], steps : _steps}]
        },

        SyncCallStep(fromID, _,__, message, ___, ____ , toID) {
            return parseChannelStep(CHANNEL_TYPE.REQ_RES,SCENARIO_STEP_TYPE.REQ,fromID,toID,message)
        },

        AsynchCallStep(fromID, _,__, message, ___, ____ ,toID) {
            return parseChannelStep(CHANNEL_TYPE.ASYNC,SCENARIO_STEP_TYPE.REQ,fromID,toID,message)
        },

        SyncResponse(callerID,_,msg,__,responderID) {
            let caller = callerID.asIR()[0]
            let msgText = msg.asIR()[0]
            let responder = responderID.asIR()[0]

            let channel = newChannel(CHANNEL_TYPE.REQ_RES,caller,responder)
            if (!channelDefined(channel)) throw new Error(`Channel undefined for response step: ${caller} -(${msgText})-< ${responder}`)

            let step = newStep(channelsParsed[channel.id],SCENARIO_STEP_TYPE.RES,msgText)
            return [step]
        },

        DataWrite(writerID,_,msg,__,storeID) {
            return parseFlowStep(DATA_FLOW_TYPE.WRITE,SCENARIO_STEP_TYPE.DATA_WRITE,writerID,storeID,msg)

        },

        DataRead(readerID,_,msg,__,storeID) {
            return parseFlowStep(DATA_FLOW_TYPE.READ,SCENARIO_STEP_TYPE.DATA_READ,storeID,readerID,msg)
        },

        DataFlowWrite(agentID,_,storeID) {
            return parseDataFlow(DATA_FLOW_TYPE.WRITE,agentID,storeID)
        },

        DataFlowRead(agentID,_,storeID) {
            return parseDataFlow(DATA_FLOW_TYPE.READ,storeID,agentID)
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
    createParser,
    getLanguageKeywords
}

