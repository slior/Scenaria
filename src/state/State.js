
const zlib = require('zlib')
const { ANNOTATION_KEY } = require('../SystemModel')

function encodeState(graph,code)
{
    let state = {
        c : code
    }
    const { compressed: compressedGraph, keyMap} = compress(graph);

    console.log(`length of uncompressed graph: ${JSON.stringify(graph).length}`)
    console.log(`length of compressed graph: ${JSON.stringify(compressedGraph).length}`)
    state.g = compressedGraph
    state.k = keyMap
    let stateString = JSON.stringify(state)
    return stateString


}

function decodeState(stateValue)
{
    let state = JSON.parse(stateValue)
    if (!state.g) throw new Error(`Missing graph from state to decode: ${JSON.stringify(state)}`)
    if (!state.k) throw new Error(`Missing compression keymap in state: ${JSON.stringify(state)}`)
    const decompressedGraph = decompress(state.g,state.k)
    state.g = decompressedGraph
    return state;
}



/**
 * Compresses an object by generating short key names and recursively compressing the object.
 * 
 * @param {Object} obj The object to compress.
 * @returns {Object,Object} The compressed object and the key map.
 */
function compress(obj)
{
    const keyMap = {};
    let keyCounter = 0;

    // Generate short key names
    const generateKey = (() =>
    {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        return () => {
            let key = "";
            let num = keyCounter++;
            do
            {
                key = chars[num % chars.length] + key;
                num = Math.floor(num / chars.length);
            } while (num > 0);
            return key;
        };
    })();

    // Compress the object recursively
    function _compress(obj)
    {
        if (Array.isArray(obj))
        {
            return obj.map(el => _compress(el));
        }
        else if (obj !== null && typeof obj === "object")
        {
            const compressedObj = {};
            for (const key in obj)
            {
                if (!keyMap[key])
                    keyMap[key] = generateKey();
                compressedObj[keyMap[key]] = _compress(obj[key]);
            }
            return compressedObj;
        }
        return obj; // Primitive value, leave as is
    }

    return { compressed: _compress(obj), keyMap };
}


/**
 * Decompresses a compressed object back to its original form using a provided key map.
 * 
 * @param {Object} compressed The compressed object to decompress.
 * @param {Object} keyMap The key map used for compression.
 * @returns {Object} The decompressed object.
 * @see compress
 */
function decompress(compressed, keyMap)
{
    // Create a reverse map for efficient lookup
    const reverseKeyMap = Object.fromEntries(
        Object.entries(keyMap).map(([original, short]) => [short, original])
    );

    // Decompress recursively
    function _decompress(obj)
    {
        if (Array.isArray(obj))
        {
            return obj.map(_decompress);
        }
        else if (obj !== null && typeof obj === "object")
        {
            const decompressedObj = {};
            for (const key in obj)
            {
                const originalKey = reverseKeyMap[key];
                decompressedObj[originalKey] = _decompress(obj[key]);
            }
            return decompressedObj;
        }
        return obj; // Primitive value, leave as is
    }

    return _decompress(compressed);
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

    /**
     * Encodes the state (graph and code) into a base64 string.
     * 
     * @param {Object} graph The graph data to encode.
     * @param {String} code The code to encode.
     * @returns {String} The base64 encoded string of the state.
     */
    static encode(graph, code)
    {
        let state = encodeState(graph,code)
        console.log(`state length uncompressed: ${state.length}`)
        let compressedState = zlib.deflateSync(state)
        let state64 = compressedState.toString('base64')
        console.log(`state length compressed: ${state64.length}`)
        return state64
    }

    /**
     * Creates a new State instance from a base64 string.
     * 
     * @param {String} str The base64 string to parse.
     * @returns {State} A new State instance.
     * @throws {Error} Throws an error if the string is invalid.
     */
    static fromBase64(str)
    {
        if (!str) throw new Error("Invalid string to parse for state")
        let inflated = zlib.inflateSync(Buffer.from(str,'base64'))
        let parsedObj = decodeState(inflated)
        return new State(parsedObj.g,parsedObj.c)
    }

    get code() { return this._code }
    get graph() { return this._graph }
}


module.exports = {
    State,

    //For testing purposes
    compress,
    decompress
}