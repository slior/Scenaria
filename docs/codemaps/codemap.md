# Codebase Code Map

## Purpose

This project is an interactive diagramming tool that allows users to define system models and interaction scenarios using a custom language called `scenaria`. It can parse this language, render a visual diagram of the system, and execute the defined scenarios step-by-step or all at once.

## Child Components

-   [`src`](./src/codemap.md): Contains the core application logic. It is responsible for orchestrating the different parts of the application, including parsing the `scenaria` language, rendering the diagram, and executing scenarios.
-   [`test`](./test/codemap.md): Contains the automated tests for the application. The tests are written using the Mocha test framework and the should.js assertion library. 