const _ohm = require('ohm-js')
const ohm = _ohm.default || _ohm; //workaround to allow importing using common js in node (for testing), and packing w/ webpack.
const { Comment, Actor, Program, TextLiteral } = require('./IR')


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

    irBuilder.addOperation("asIR()", {

        Program(programElements) {
            return [new Program(programElements.asIR())]
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
            return [new Comment(text.sourceString)]
        },

        ActorDef(_, caption, __, id) {
            return [new Actor(id.asIR()[0],
                              caption.asIR()[0].text)]
        },

        TextLiteral(_,s,__) {
            return [new TextLiteral(s.sourceString)]
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
            return irBuilder(m).asIR()[0]; //the single element should be the Program
        else
            throw new Error(`Failed to parse program: ${m.message}`)
    }
}

module.exports = {
    createParser
}

