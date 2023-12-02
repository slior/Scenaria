
class Comment
{
    constructor (txt)
    {
        this._text = txt || ""
    }

    get text() { return this._text }
}

class TextLiteral
{
    constructor(txt)
    {
        // assertNotNull(txt)
        this._text = txt || ""
    }

    get text() { return this._text.toString() }
}

class Actor
{
    constructor(__id,__caption)
    {
        this._id = __id;
        this._caption = __caption
    }

    get id() { return this._id}
    get caption() { return this._caption}
}

class Store
{
    constructor(__id,__caption)
    {
        this._id = __id;
        this._caption = __caption
    }

    get id() { return this._id}
    get caption() { return this._caption}
}

class Block
{
    constructor(_stmts)
    {
        this._statements = _stmts || [];
    }

    get statements()
    {
        return this._statements.filter(st => !(st instanceof Comment));
    }
}

class Program extends Block
{
    constructor(_stmts)
    {
        super(_stmts)
    }
}

module.exports = {
    Comment,
    Actor,
    Program,
    TextLiteral,
    Store
}