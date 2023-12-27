
function encodeState(graph,code)
{
    let state = {
        g : graph,
        c : code
    }
    let stateString = JSON.stringify(state)
    let state64 = Buffer.from(stateString).toString('base64')
    return state64;


}

function decodeState(stateValue)
{
    let str = Buffer.from(stateValue,'base64').toString('utf-8')
    return JSON.parse(str)
}

function codeFromState(state)
{
    return state.c;
}

class State
{
    constructor(_graph,_code)
    {
        if (!_graph) throw new Error("Invalid graph for app state")
        if (!_code) throw new Error("Invalid code for app state")

        this._graph = _graph
        this._code = _code
    }

    static encode(graph,code)
    {
        return encodeState(graph,code)
    }

    static fromBase64(str)
    {
        if (!str) throw new Error("Invalid string to parse for state")
        let parsedObj = decodeState(str)
        return new State(parsedObj.g,parsedObj.c)
    }

    get code() { return this._code }
    get graph() { return this._graph }
}


module.exports = {
    State
}