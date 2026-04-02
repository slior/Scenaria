import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate'

function u8ToBase64(u8) {
    if (typeof Buffer !== 'undefined') return Buffer.from(u8).toString('base64')
    let s = ''
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i])
    return btoa(s)
}

function base64ToU8(b64) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'))
    const bin = atob(b64)
    const u8 = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
    return u8
}

function encodeState(graph, code) {
    let state = {
        c: code
    }
    const { compressed: compressedGraph, keyMap } = compress(graph)

    console.log(`length of uncompressed graph: ${JSON.stringify(graph).length}`)
    console.log(`length of compressed graph: ${JSON.stringify(compressedGraph).length}`)
    state.g = compressedGraph
    state.k = keyMap
    let stateString = JSON.stringify(state)
    return stateString
}

function decodeState(stateValue) {
    let state = JSON.parse(stateValue)
    if (!state.g) throw new Error(`Missing graph from state to decode: ${JSON.stringify(state)}`)
    if (!state.k) throw new Error(`Missing compression keymap in state: ${JSON.stringify(state)}`)
    const decompressedGraph = decompress(state.g, state.k)
    state.g = decompressedGraph
    return state
}

/**
 * Compresses an object by generating short key names and recursively compressing the object.
 *
 * @param {Object} obj The object to compress.
 * @returns {Object,Object} The compressed object and the key map.
 */
function compress(obj) {
    const keyMap = {}
    let keyCounter = 0

    const generateKey = (() => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
        return () => {
            let key = ''
            let num = keyCounter++
            do {
                key = chars[num % chars.length] + key
                num = Math.floor(num / chars.length)
            } while (num > 0)
            return key
        }
    })()

    function _compress(obj) {
        if (Array.isArray(obj)) {
            return obj.map(el => _compress(el))
        } else if (obj !== null && typeof obj === 'object') {
            const compressedObj = {}
            for (const key in obj) {
                if (!keyMap[key]) keyMap[key] = generateKey()
                compressedObj[keyMap[key]] = _compress(obj[key])
            }
            return compressedObj
        }
        return obj
    }

    return { compressed: _compress(obj), keyMap }
}

/**
 * Decompresses a compressed object back to its original form using a provided key map.
 *
 * @param {Object} compressed The compressed object to decompress.
 * @param {Object} keyMap The key map used for compression.
 * @returns {Object} The decompressed object.
 * @see compress
 */
function decompress(compressed, keyMap) {
    const reverseKeyMap = Object.fromEntries(
        Object.entries(keyMap).map(([original, short]) => [short, original])
    )

    function _decompress(obj) {
        if (Array.isArray(obj)) {
            return obj.map(_decompress)
        } else if (obj !== null && typeof obj === 'object') {
            const decompressedObj = {}
            for (const key in obj) {
                const originalKey = reverseKeyMap[key]
                decompressedObj[originalKey] = _decompress(obj[key])
            }
            return decompressedObj
        }
        return obj
    }

    return _decompress(compressed)
}

class State {
    constructor(_graph, _code) {
        if (!_graph) throw new Error('Invalid graph for app state')
        if (!_code) throw new Error('Invalid code for app state')

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
    static encode(graph, code) {
        let state = encodeState(graph, code)
        console.log(`state length uncompressed: ${state.length}`)
        let compressedState = deflateSync(strToU8(state))
        let state64 = u8ToBase64(compressedState)
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
    static fromBase64(str) {
        if (!str) throw new Error('Invalid string to parse for state')
        let inflated = inflateSync(base64ToU8(str))
        let parsedObj = decodeState(strFromU8(inflated))
        return new State(parsedObj.g, parsedObj.c)
    }

    get code() {
        return this._code
    }
    get graph() {
        return this._graph
    }
}

export { State, compress, decompress }
