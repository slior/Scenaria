# `lang` Directory Code Map

## Purpose

This directory is responsible for parsing the `scenaria` language. It defines the grammar and the semantics for translating the language into the System Model.

## Files

-   [`Lang.js`](../../../src/lang/Lang.js): Implements the parser for the `scenaria` language. It uses the grammar defined in `scenaria.ohm.js` and an `ohm-js` semantics object to build the system model from the parsed source code.
    -   `createParser()`: Creates and returns a parser function that can take `scenaria` code and return a system model.
-   [`scenaria.ohm.js`](../../../src/lang/scenaria.ohm.js): Defines the formal grammar for the `scenaria` language using the `ohm-js` library.
    -   `grammar`: The string constant containing the full language grammar.
    -   `KEYWORDS`: An object exporting all the reserved keywords of the language.

## Architecture

The parsing process leverages the `ohm-js` library. The grammar is defined declaratively in `scenaria.ohm.js`. `Lang.js` then defines a "semantic" object that attaches parsing actions to the grammar rules. These actions are responsible for building the Intermediate Representation (IR), which in this case is the `SystemModel`. 