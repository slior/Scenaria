# System Patterns

## Architecture Overview

Scenaria is a purely **client-side application**. It runs entirely in the browser, with no backend server or database component. This design choice aligns with the goal of easy, zero-setup deployment. All data, including the model and scenario definitions, is encoded in the URL for sharing.

```mermaid
graph TD
    subgraph Browser
        A[User Interface]
        B[Text Editor <br> (monaco-editor)]
        C[Language Compiler <br> (ohm.js)]
        D[Layout Engine <br> (elk.js)]
        E[SVG Renderer <br> (svg.js)]
        F[Scenario Runner]
    end

    A --> B
    B -- Raw Text --> C
    C -- Parsed Model --> D
    C -- Parsed Model & Scenarios --> F
    D -- Positioned Diagram --> E
    F -- Step Events --> E
```

## Key Design Patterns

- **Compiler/Interpreter:** The core of Scenaria is a custom language compiled/interpreted by `ohm.js`. The user's text input is parsed into an Abstract Syntax Tree (AST) representing the system model and its scenarios.
- **State in URL:** To achieve seamless sharing, the entire state of the application (the user's code) is encoded into the URL's hash. This makes the application stateless from a server perspective.
- **Declarative UI:** The diagram is a direct visual representation of the model described by the user. When the model changes, the diagram is re-rendered.
- **Flow Control:** The application manages two key flows:
    1.  **Model Presentation:** Parsing the user's text to render and layout the system diagram.
    2.  **Scenario Execution:** Running a selected scenario step-by-step and visually updating the diagram to reflect the state changes. 