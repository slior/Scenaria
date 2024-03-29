const _ohm = require('ohm-js')
const ohm = _ohm.default || _ohm; //workaround to allow importing using common js in node (for testing), and packing w/ webpack.

const { ACTOR_TYPE, DATA_FLOW_TYPE, CHANNEL_TYPE,
        newChannel, newStep, SCENARIO_STEP_TYPE,
        newDataFlow, newDataFlowStep, newActor,
        ANNOTATION_KEY, newAnnotationDefElement, 
        newSystemModel } = require('../SystemModel')


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
    let annotationsDefsParsed = {}

    //Helper functions for parsing
    function isValidDataFlow(type,from,to)
    {
        let agentID = type == DATA_FLOW_TYPE.READ ? to : from;
        let storeID = type == DATA_FLOW_TYPE.READ ? from : to;

        return isValidAgent(agentID) && isValidStore(storeID)
    }

    function isValidAgent(agentID) { return agentsParsed[agentID] && [ACTOR_TYPE.AGENT, ACTOR_TYPE.USER].includes(agentsParsed[agentID].type) }
    function isValidStore(storeID) { return (storesParsed[storeID] && storesParsed[storeID].type) == ACTOR_TYPE.STORE }
    function isValidActor(actorID) { return isValidAgent(actorID) || isValidStore(actorID) }

    function annotateActor(actorID,annotations)
    {
        if (!annotations) return;
        let actor = isValidAgent(actorID)?
                        agentsParsed[actorID] : 
                        (isValidStore(actorID) ? storesParsed[actorID] : null)
        if (!actor) throw new Error(`Invalid actor ID for annotation - no actor found for ${actorID}`)
        if (!(actor.annotations)) actor.annotations = []
        annotations.forEach(annot => actor.annotations.push(annot))
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

    function rememberAnnotation(id,statements)
    {
        let annot = {}
        statements.forEach(st => Object.assign(annot,st))
        annotationsDefsParsed[id] = annot;
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
            /// all XXXParsed collections are filled as a result of the asIR call
            let actors = Object.values(agentsParsed)
                        .concat(Object.values(storesParsed))
            let dataFlows = Object.values(flowsParsed)
            let channels = Object.values(channelsParsed)

            let scenarios = definedElements.filter(el => isScenario(el))

            let p = newSystemModel(actors,channels,dataFlows,scenarios,annotationsDefsParsed)
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
            return []
        },

        AgentDef(_, caption, __, id, maybeAnnotationAssign) {
            let actorID = id.asIR()[0]
            let a = newActor(ACTOR_TYPE.AGENT,actorID,caption.asIR()[0])
            rememberAgent(a)
            if (maybeAnnotationAssign.children.length > 0)
                annotateActor(actorID,maybeAnnotationAssign.asIR())
            return [a]
        },

        StoreDef(_, caption, __, id, maybeAnnotationAssign) {
            let storeID = id.asIR()[0]
            let s = newActor(ACTOR_TYPE.STORE,storeID, caption.asIR()[0])
            rememberStore(s)
            if (maybeAnnotationAssign.children.length > 0)
                annotateActor(storeID,maybeAnnotationAssign.asIR())
            return [s]
        },

        UserDef(_,caption,__,id, maybeAnnotationAssign) {
            let userID = id.asIR()[0]
            let u = newActor(ACTOR_TYPE.USER,userID,caption.asIR()[0])
            rememberAgent(u)
            if (maybeAnnotationAssign.children.length > 0)
                annotateActor(userID,maybeAnnotationAssign.asIR())
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

        AnnotationAssignment(_actorID,annotAssignmentClause) {
            let actorID = _actorID.asIR()[0];
            let annotationIDs = annotAssignmentClause.asIR()
            if (!isValidActor(actorID)) throw new Error(`Invalid actor id for annotation: ${actorID}`)
            annotateActor(actorID,annotationIDs)
            return []

        }, 

        AnnotationAssignmentClause(_, _annotationsIDs) {
            return _annotationsIDs.asIR()
        },

        annotationRef(_, annot) {
           return annot.asIR()
        },
        
        AnnotationRefList(maybeFirstElement, _, restOfAnnotRefs) {
            let first = maybeFirstElement.children.length > 0 ? maybeFirstElement.children[0].asIR() : []
            let otherElements = restOfAnnotRefs.children.flatMap(e => e.asIR())
            return first.concat(otherElements)
        },

        AnnotationDef(_,ident, __, annotStatements, ___) {
            let annotID = ident.asIR()[0]
            let annotationsStmts = annotStatements.asIR()
            rememberAnnotation(annotID,annotationsStmts)
            return []
        },

        AnnotationStatement(stmt,_) {
            return stmt.asIR()
        },

        AnnotColorStmt(_,__, colorVal ) {
            let color = colorVal.asIR()[0]
            return [newAnnotationDefElement(ANNOTATION_KEY.COLOR,color)]
        },

        AnnotProtoStmt(_,__,protoVal) {
            let prototype = protoVal.asIR()[0]
            return [newAnnotationDefElement(ANNOTATION_KEY.PROTO,prototype)]
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

