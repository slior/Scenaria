# Technical Context

## Technology Stack

- **Core Language:** Plain JavaScript (ES6+).
- **Build Tools:**
  - **Bundler:** webpack
  - **Package Manager:** npm
- **Core Libraries:**
  - **Language Parsing:** `ohm.js` is used to create the compiler for the Scenaria language.
  - **Diagram Layout:** `elk.js` is used to automatically calculate the layout of the diagram nodes and edges.
  - **SVG Rendering:** `SVG.js` is used for all drawing and manipulation of the SVG-based diagram.
  - **Text Editor:** The `monaco-editor` provides the in-browser code editing experience.

## Development Environment

- The project is built using Node.js.
- `webpack-dev-server` provides a local development server with hot reloading.
- Code is managed in a Git repository.

## Deployment
- The application is deployed as a static site using a multi-stage `Dockerfile`.
- The final Docker image uses `nginx:stable-alpine` to serve the built static assets (`index.html`, `viewer.html`, `main.js`, etc.).

## Constraints

- The application is intentionally kept simple with minimal dependencies.
- It must be purely a client-side, browser-based application.
- All state for sharing must be contained within the URL. 