
function encodeState(graph,code)
{
    let state = {
        c : code
    }
    console.log(`length of uncompressed graph: ${JSON.stringify(graph).length}`)
    console.log(`length of compressed graph: ${JSON.stringify(compressGraph(graph)).length}`)
    state.g = compressGraph(graph)
    let stateString = JSON.stringify(state)
    let state64 = Buffer.from(stateString).toString('base64')
    return state64;


}

function decodeState(stateValue)
{
    let str = Buffer.from(stateValue,'base64').toString('utf-8')
    let state = JSON.parse(str)
    if (state.g)
        state.g = decompressGraph(state.g)
    else throw new Error(`Missing graph from state to decode: ${JSON.stringify(state)}`)
    return state;
}

const COMPRESSED_KEYS = {
    //for nodes
    children : "c",
    type : "t",
    id : "i",
    width : "w",
    height : "h",
    x : "x",
    y : "y",
    caption : "ca", 
    fillColor : "fc",
    lineColor : 'lc',

    //for edges
    edges : "e",
    sources : "s",
    targets : "ts",
    sections : "se",
    startPoint : "sp",
    ednPoint : "ep",
    bendPoints : "bp"

}

const UNCOMPRESSED_KEYS = {}
let cks = Object.keys(COMPRESSED_KEYS)
Object.values(COMPRESSED_KEYS).forEach(v => {
    let k = cks.find(_k => COMPRESSED_KEYS[_k] == v)
    if (k) 
        UNCOMPRESSED_KEYS[v] = k
    else throw new Error(`Could not reverse map key for ${v}`)
})

function compressGraph(graph)
{
    let compressed = {}
    compressed[COMPRESSED_KEYS['children']] = graph.children.map(child => {
        let compressedChild = {}
        Object.keys(child).forEach(k => {
            let ck = COMPRESSED_KEYS[k]
            if (ck)
                compressedChild[ck] = child[k]
        })
        return compressedChild
    })

    compressed[COMPRESSED_KEYS['edges']] = graph.edges.map(edge => {
        let compressedEdge = {}
        compressedEdge[COMPRESSED_KEYS['sources']] = edge['sources']
        compressedEdge[COMPRESSED_KEYS['targets']] = edge['targets']
        compressedEdge[COMPRESSED_KEYS['type']] = edge['type']
        compressedEdge[COMPRESSED_KEYS['id']] = edge['id']
        compressedEdge[COMPRESSED_KEYS['sections']] = edge.sections.map(section => {
            let compressedSection = {}
            compressedSection[COMPRESSED_KEYS['id']] = section['id']
            compressedSection[COMPRESSED_KEYS['startPoint']] = section['startPoint']
            compressedSection[COMPRESSED_KEYS['endPoint']] = section['endPoint']
            compressedSection[COMPRESSED_KEYS['bendPoints']] = section['bendPoints']
            return compressedSection
        })
        return compressedEdge
    })
    return compressed
}

function decompressGraph(compressed)
{
    let graph = {}
    let children = compressed[COMPRESSED_KEYS['children']]
    let uncompressedChildren = children.map(compressedChild => {
        let uncompressedChild = {}
        Object.keys(UNCOMPRESSED_KEYS).forEach(ck => {
            let uck = UNCOMPRESSED_KEYS[ck]
            if (uck)
                uncompressedChild[uck] = compressedChild[ck]
            else throw new Error(`Unrecognized compressed key ${ck}`)
        })
        return uncompressedChild
    })
    graph.children = uncompressedChildren

    
    let uncompressedEdges = compressed[COMPRESSED_KEYS['edges']].map(compressedEdge => {
        let uncompressedEdge = {}
        uncompressedEdge['id'] = compressedEdge[COMPRESSED_KEYS['id']]
        uncompressedEdge['sources'] = compressedEdge[COMPRESSED_KEYS['sources']]
        uncompressedEdge['targets'] = compressedEdge[COMPRESSED_KEYS['targets']]
        uncompressedEdge['type'] = compressedEdge[COMPRESSED_KEYS['type']]

        uncompressedEdge.sections = compressedEdge[COMPRESSED_KEYS['sections']].map(compressedSection => {
            let uncompressedSection = {}
            uncompressedSection['id'] = compressedSection[COMPRESSED_KEYS['id']]
            uncompressedSection['startPoint'] = compressedSection[COMPRESSED_KEYS['startPoint']]
            uncompressedSection['endPoint'] = compressedSection[COMPRESSED_KEYS['endPoint']]
            uncompressedSection['bendPoints'] = compressedSection[COMPRESSED_KEYS['bendPoints']]
            return uncompressedSection
        })
        return uncompressedEdge
    })

    graph.edges = uncompressedEdges
    return graph;
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