# `test` Directory Code Map

## Purpose

This directory contains the automated tests for the application. The tests are written using the [Mocha](https://mochajs.org/) test framework and the [should.js](https://shouldjs.github.io/) assertion library.

## Files

-   [`ParserTest.js`](../../test/ParserTest.js): Contains unit tests for the `scenaria` language parser (`src/lang/Lang.js`). It verifies that various language constructs are parsed correctly into the expected Intermediate Representation (IR).
-   [`ModelTest.js`](../../test/ModelTest.js): Contains unit tests for the `SystemModel.js` module. It tests the creation and type-checking of model objects like actors, channels, and containers.
-   [`DiagDrawTest.js`](../../test/DiagDrawTest.js): Contains unit tests for the diagram drawing and layout logic in `src/diagram/DiagDraw.js`. It tests functions for node type identification and edge retrieval.
-   [`StateTest.js`](../../test/StateTest.js): Contains unit tests for the state serialization logic in `src/state/State.js`. It focuses on the `compress` and `decompress` functions.
-   `*.scenaria`: These are test data files containing `scenaria` source code used as input for the `ParserTest.js` tests.
-   `*.json`: These are test data files, likely containing expected outputs or mock data for various tests.

## Architecture

The tests are organized by the module they are testing. Each `*Test.js` file corresponds to a module in the `src` directory. The tests instantiate components from the source, provide them with input (often from the `.scenaria` or `.json` files), and assert that the output or behavior is as expected. 