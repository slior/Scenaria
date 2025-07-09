# `state` Directory Code Map

## Purpose

This directory is responsible for managing the application's state, primarily for persistence. It handles the serialization and deserialization of the application state so it can be saved and restored.

## Files

-   [`State.js`](../../../src/state/State.js): Implements the logic for encoding and decoding the application state. The state includes the graph layout from the diagram and the source code from the editor. It uses compression to create a compact, base64-encoded string representation of the state, suitable for storing in a URL.
    -   `State.encode()`: Takes the graph and code and returns a compressed, base64-encoded string.
    -   `State.fromBase64()`: Takes a base64-encoded string and returns a `State` object with the restored graph and code.

## Architecture

To minimize the length of the serialized state string (e.g., for use in a URL), the `State.js` module employs a two-level compression strategy:
1.  **Key Compression**: It replaces the long, descriptive keys in the JSON representation of the graph with short, single-character keys. A map is maintained to allow for decompression.
2.  **zlib Compression**: The resulting JSON string is then further compressed using the standard `zlib` library (specifically, `deflate`).

The final output is a base64 string. 