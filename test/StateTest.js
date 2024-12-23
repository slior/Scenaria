const { compress, decompress } = require('../src/state/State');
const should = require('should');

describe('compress function', () => {
    it('should compress a simple object', () =>
    {
        const input = { x: 1, y: 2 };
        const { compressed, keyMap } = compress(input);
        Object.keys(compressed).length.should.equal(2)
        keyMap.should.have.property('x')
        keyMap.should.have.property('y')
        compressed[keyMap['x']].should.equal(input.x)
        compressed[keyMap['y']].should.equal(input.y)
        Object.keys(keyMap).length.should.equal(2);
    });

    it('should compress nested objects', () =>
    {
        const input = { a: { b: 2 }, c: 3 };
        const { compressed, keyMap } = compress(input);
        Object.keys(keyMap).length.should.equal(3);
        keyMap.should.have.property('a');
        keyMap.should.have.property('c');
        keyMap.should.have.property('b');
        compressed[keyMap['a']][keyMap['b']].should.equal(input.a.b)
    });

    it('should compress arrays', () =>
    {
        const input = { arr: [1, 2, 3] };
        const { compressed, keyMap } = compress(input);
        keyMap.should.have.property('arr'); 
        compressed[keyMap['arr']].should.deepEqual([1, 2, 3]);
    });

    it('should handle empty objects', () =>
    {
        const input = {};
        const { compressed, keyMap } = compress(input);
        compressed.should.be.empty(); 
        keyMap.should.be.empty();
    });

    it('should handle primitive values', () =>
    {
        const input = { a: null, b: true, c: 'string' };
        const { compressed, keyMap } = compress(input);
        keyMap.should.have.property('a'); 
        keyMap.should.have.property('b'); 
        keyMap.should.have.property('c'); 
        should(compressed[keyMap['a']]).be.null()
        should(compressed[keyMap['b']]).be.true
        compressed[keyMap['c']].should.equal('string')
    });
});

describe('decompress', () => {
    it('should decompress a valid compressed object', () => 
    {
        const compressed = { a: 1, b: { c: 2 } };
        const keyMap = { x: 'a', y: 'b', z: 'c' };
        const expected = { x: 1, y: { z: 2 } };
        
        const result = decompress(compressed, keyMap);
        result.should.deepEqual(expected);
    });

    it('should handle empty input', () =>
    {
        const compressed = {};
        const keyMap = {};
        
        const result = decompress(compressed, keyMap);
        result.should.deepEqual({});
    });

    it('should handle arrays', () => {
        const compressed = [{ a: 1 }, { b: 2 }];
        const keyMap = { x: 'a', y: 'b' };
        const expected = [{ x: 1 }, { y: 2 }];
        
        const result = decompress(compressed, keyMap);
        result.should.deepEqual(expected);
    });
});