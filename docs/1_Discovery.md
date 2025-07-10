# Project Overview

This document provides a high-level overview of the Scenaria codebase structure, key components, dependencies, and development scripts.

## 1. Project Overview

- **Name**: "Scenaria"
- **Description**: A purely client-side, browser-based application for describing and visualizing system architectures and interaction scenarios. It features a custom DSL, immediate visual feedback, and sharing via URL encoding.
- **License**: ISC

## 2. Entry Points

The application has two main user-facing HTML files and one primary JavaScript bundle entry point.

- **Main Application**: `index.html`
  - The full development and editing environment.
- **Viewer**: `viewer.html`
  - A read-only view for presenting shared diagrams and scenarios.
- **JavaScript Entry**: `src/AppMain.js`
  - The main script that orchestrates the entire application. It is compiled by Webpack into `main.js`.

## 3. Directory Structure

The repository is organized into the following key directories:

```
.
├── docs/                 # Project documentation (flows, language specs)
├── memory-bank/          # High-level project context and progress
├── src/                  # Main application source code
│   ├── diagram/          # Diagram rendering, layout, and control
│   ├── lang/             # Language parsing (Ohm.js grammar and parser)
│   └── state/            # URL state management
├── test/                 # Mocha tests
├── node_modules/         # npm dependencies
├── .cursor/
├── .git/
├── .vscode/
└── lib/                  # bundled third party libraries
```

## 4. Core Modules & Components

The application's logic is modular, with components responsible for distinct areas of functionality.

| Module Path                             | Description                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/AppMain.js`                        | **Main Orchestrator**. Initializes all components and manages the core application flows.                 |
| `src/lang/scenaria.ohm.js`              | **Language Grammar**. The formal definition of the Scenaria DSL using Ohm.js.                           |
| `src/lang/Lang.js`                      | **Language Parser**. Uses the Ohm.js grammar to parse user input into an Abstract Syntax Tree (AST).      |
| `src/SystemModel.js`                    | **Data Model**. Represents the parsed system structure (actors, stores, channels) and scenarios.        |
| `src/diagram/DiagDraw.js`               | **Diagram Layout**. Uses `elkjs` to calculate the layout (positions) of diagram elements.                 |
| `src/diagram/DiagramPainter.js`         | **Diagram Renderer**. Handles the low-level drawing of the diagram elements onto the SVG canvas.        |
| `src/diagram/DiagramController.js`      | **Interaction Handler**. Manages user interactions with the diagram (e.g., clicks, drags).                |
| `src/ScenarioRunner.js`                 | **Scenario Manager**. Manages the list of available scenarios from the model.                            |
| `src/ScenarioExecuter.js`               | **Scenario Executor**. Executes the steps of a selected scenario, updating the model and view.          |
| `src/state/State.js`                    | **State Manager**. Encodes the application state into the URL hash for sharing and decodes it on load.    |
| `src/Editor.js`                         | **Text Editor**. Configures and manages the `monaco-editor` instance.                                   |

## 5. External Dependencies

The project relies on several key external libraries to function.

| Dependency          | Version    | Usage                                                               |
| ------------------- | ---------- | ------------------------------------------------------------------- |
| `ohm-js`            | `^16.4.0`  | Parsing the custom Scenaria DSL.                                    |
| `elkjs`             | `^0.8.2`   | Automatic graph layout for the diagram.                             |
| `@svgdotjs/svg.js`  | `^3.1.2`   | Creating and manipulating the SVG diagram.                          |
| `monaco-editor`     | `^0.34.1`  | The rich text editor for writing Scenaria code.                     |
| `web-worker`        | `^1.2.0`   | Running the computationally intensive layout engine (`elkjs`) off the main UI thread. |

## 6. Build & Test

The project uses `npm` to manage scripts for building and testing.

- **Build**: `npm run build`
  - Uses `webpack` to bundle `src/AppMain.js` and its dependencies into a single file: `main.js`.
  - Configuration is located in `webpack.config.js`.

- **Test**: `npm test`
  - Uses the `mocha` framework to run tests.
  - Test files are located in the `test/` directory.

## 7. Deployment

As a purely client-side application, deployment is straightforward. The application can be run by:
1.  Serving the project's root directory using any static file server.
2.  Opening `index.html` directly in a web browser (though a server is recommended).
No backend or database is required. 