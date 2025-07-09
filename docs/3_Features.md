# Phase 3: Feature Documentation

This document describes the user-facing features of the Scenaria application, focusing on the language (DSL) and user interface interactions.

## 1. Core Concepts

Scenaria is built around a few simple concepts for modeling systems:

-   **Actors**: These are the primary components of your system.
    -   **Agent/User**: An _active_ component that performs actions and communicates. A `user` is a special type of agent representing a human interactor.
    -   **Store**: A _passive_ component representing a data store (e.g., a database, cache, or file).
-   **Communication**: How actors interact.
    -   **Channels**: Defined between agents for request-response (synchronous) or message-passing (asynchronous) communication.
    -   **Data Flows**: Defined between an agent and a store to show data being read or written.
-   **Scenarios**: A sequence of steps that describe a specific interaction or workflow within the system, illustrating how actors collaborate over time.

## 2. The Scenaria Language (DSL)

The primary way to interact with Scenaria is by writing code in its custom Domain-Specific Language.

*Identifiers* are alphanumeric names used for components (e.g., `cart_service`), and *text literals* are human-readable labels enclosed in single quotes (e.g., `'Cart Service'`).

### 2.1. Defining Actors

| Type    | Syntax                                 | Example                               |
| ------- | -------------------------------------- | ------------------------------------- |
| `agent` | `agent` '_name_' `as` _id_             | `agent 'Cart Service' as cs`          |
| `user`  | `user` '_name_' `as` _id_              | `user 'Shopper' as s`                 |
| `store` | `store` '_name_' `as` _id_             | `store 'Product Database' as products`  |

### 2.2. Defining Communication

While scenarios can implicitly create channels and flows, you can also define them statically.

-   **Synchronous Channel**: `s -('add item')-> cs`
-   **Asynchronous Channel**: `cs -('order placed')-\\ os`
-   **Agent Writes to Store**: `cs --> cart_data`
-   **Agent Reads from Store**: `cs <-- product_data`

### 2.3. Defining Scenarios

A scenario is a named block of steps.

**Syntax**:
```
'Scenario Name' {
    // sequence of steps
}
```

**Scenario Steps**:

| Type                  | Syntax                                           | Example                                  |
| --------------------- | ------------------------------------------------ | ---------------------------------------- |
| **Sync Call**         | _sender_ `-(`'_msg_'`)->` _receiver_             | `s -('add item')-> cs`                   |
| **Sync Response**     | _receiver_ `--(`'_msg_'`)--<` _sender_           | `cs --('OK')--< s`                        |
| **Async Message**     | _sender_ `-(`'_msg_'`)-\\ ` _receiver_            | `cs -('order created')-\\ os`             |
| **Data Write**        | _agent_ `-` '_data_' `->` _store_                | `cs -'item data'-> cart_data`            |
| **Data Read**         | _agent_ `<-` '_data_' `-` _store_                | `cs <-'product info'- product_data`      |
| **Comment**           | `// your comment`                                | `// Check if the item is in stock`       |

### 2.4. Organizing the Model

-   **Containers**: Group related actors into a visual container.
    ```
    container 'Backend Services' as backend {
        agent 'Order Service' as os
        agent 'Inventory Service' as inv
    }
    ```
-   **Notes**: Add tooltip descriptions to actors.
    `note for os: 'Handles order processing'`

### 2.5. Annotations (Visual Cues)

Annotations provide a way to add visual metadata (color, prototypes) to actors.

**1. Define the Annotation**:
```
@External {
  color : 'lightblue'
  prototype: 'external'
}
```
Supported cues are `color` (any CSS color) and `prototype` (a text prefix like `<<external>>`).

**2. Assign to an Actor**:
```
// Assign during definition
agent 'Payment Gateway' as pg is @External

// Assign after definition
inv is @Internal, @DB
```

## 3. User Interface and Interactions

### 3.1. Code Editor

-   A full-featured code editor based on Monaco (the editor powering VS Code).
-   Provides syntax highlighting for the Scenaria language.
-   **Live Updates**: Any change in the editor immediately triggers a re-parsing and re-rendering of the diagram.

### 3.2. Diagram View

-   A real-time SVG visualization of the system model described in the editor.
-   **Interaction**: Users can click and drag actors to manually adjust their positions.
-   **Tooltips**: Hovering over an actor with a `note` will display the note's text.

### 3.3. Scenario Controls

-   **Scenario Selector**: A dropdown menu above the diagram lists all scenarios defined in the code.
-   **Run Button**: Executes the selected scenario from beginning to end, animating each step on the diagram.
-   **Step Button**: Executes only the next step of the selected scenario, allowing for a controlled, step-by-step walkthrough.

### 3.4. Sharing

-   **URL Encoding**: The application encodes the entire content of the code editor into the URL's hash.
-   **Shareable Link**: To share a model, simply copy the full URL from your browser's address bar and send it to a collaborator. When they open the link, their application will decode the state from the URL and display the identical model and diagram. 