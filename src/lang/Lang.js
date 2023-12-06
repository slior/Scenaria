const _ohm = require('ohm-js')
const ohm = _ohm.default || _ohm; //workaround to allow importing using common js in node (for testing), and packing w/ webpack.

const { ACTOR_TYPE, DATA_FLOW_TYPE, CHANNEL_TYPE } = require('../SystemModel')


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

    irBuilder.addOperation("asIR()", {

        Program(programElements) {

            let definedElements = programElements.asIR();
            let actors = definedElements.filter(el => Object.values(ACTOR_TYPE).includes(el.type))
            let dataFlows = definedElements.filter(el => Object.values(DATA_FLOW_TYPE).includes(el.type))
            let channels = definedElements.filter(el => Object.values(CHANNEL_TYPE).includes(el.type))
            let p = {
                "name" : "",
                actors : actors,
                channels : channels,
                data_flows : dataFlows,
                scenarios : []
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

        SyncCall(fromID,channel,toID) {
            let from = fromID.asIR()[0]
            let to = toID.asIR()[0]
            let channelText = channel.asIR()[0]
            if (!isValidChannel(from,to))
                throw new Error(`Invalid channel definition: ${from} -(${channelText})-> ${to}`)
            //should avoid more than one channel between same agents?
            return [{type : CHANNEL_TYPE.REQ_RES,from : from, to : to, text : channelText }]
        },

        AsynchChannel(_, maybeText, __) {
            let channelText = maybeText.children.length > 0 ? 
                                maybeText.sourceString
                                : "";
            return [channelText]
        },

        AsynchCall(fromID,channel,toID) {
            let from = fromID.asIR()[0]
            let to = toID.asIR()[0]
            let channelText = channel.asIR()[0]
            if (!isValidChannel(from,to))
                throw new Error(`Invalid channel definition: ${from} -(${channelText})-\ ${to}`)

            return [{type : CHANNEL_TYPE.ASYNC, from : from, to : to, text : channelText}]
        },

        DataFlowWrite(agentID,_,storeID) {
            let aid = agentID.asIR()[0]
            let sid = storeID.asIR()[0]
            if (!isValidDataFlow(aid,sid))
                throw new Error(`Invalid write data flow: ${aid} --> ${sid}`)
            return [{type : DATA_FLOW_TYPE.WRITE, from : aid, to : sid}]
        },

        DataFlowRead(agentID,_,storeID) {
            let aid = agentID.asIR()[0]
            let sid = storeID.asIR()[0]
            if (!isValidDataFlow(aid,sid))
                throw new Error(`Invalid read data flow: ${aid} <-- ${sid}`)
            return [{type : DATA_FLOW_TYPE.READ, from: sid, to: aid}]
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

