# `diagram` Directory Code Map

## Purpose

This directory contains all the logic related to rendering the system model as a diagram. It is responsible for laying out the diagram elements, drawing them on an SVG canvas, and controlling their appearance.

## Files

-   [`DiagDraw.js`](../../../src/diagram/DiagDraw.js): Uses the `elkjs` library to perform automatic layout of the diagram. It translates the `SystemModel` into a graph structure that `elkjs` can process and then uses `DiagramPainter` to render the result.
    -   `layoutModel()`: The main function that takes a `SystemModel` and returns a promise that resolves with the laid-out graph.
-   [`DiagramPainter.js`](../../../src/diagram/DiagramPainter.js): Responsible for the actual drawing of diagram elements (actors, stores, channels, etc.) onto an SVG canvas using `SVG.js`. It takes the graph with layout information from `DiagDraw.js`.
    -   `drawActor()` / `drawChannel()` / `drawEdge()`: Functions for drawing specific diagram elements.
-   [`DiagramController.js`](../../../src/diagram/DiagramController.js): Provides a higher-level API to control the visual aspects of the diagram after it has been drawn. This includes highlighting elements, showing/hiding notes, and displaying messages.
    -   `highlight()` / `deHighlight()`: Change the color of diagram elements.
    -   `showNotes()` / `hideNotes()`: Manage the visibility of notes on elements.
-   [`DiagramModel.js`](../../../src/diagram/DiagramModel.js): Contains helper functions for creating and parsing IDs for the edges that connect to channel nodes, which are themselves represented as nodes in the layout.
-   [`SVGEventHandler.js`](../../../src/diagram/SVGEventHandler.js): A small utility class that encapsulates the logic for making SVG elements draggable using mouse events.

## Architecture

The diagram generation is a two-step process:
1.  **Layout**: `DiagDraw.js` takes the `SystemModel` and converts it into a hierarchical graph format understood by the `elkjs` library. `elkjs` then calculates the positions and dimensions of all nodes and the routing of the edges.
2.  **Rendering**: `DiagramPainter.js` takes the graph now enriched with layout information and uses `SVG.js` to draw the visual representation.

The `DiagramController` then provides an interface to manipulate this rendered diagram dynamically, for example, during scenario execution. 