# `src` Code Map

## Purpose

This directory contains the core application logic. It is responsible for orchestrating the different parts of the application, including parsing the scenaria language, rendering the diagram, and executing scenarios. It acts as the central hub, integrating the language processing, diagram visualization, and state management components.

## Child Components

-   [`lang`](./lang/codemap.md): Responsible for parsing the `scenaria` language. It defines the grammar and the semantics for translating the language into the System Model.
-   [`diagram`](./diagram/codemap.md): Contains all the logic related to rendering the system model as a diagram. It is responsible for laying out the diagram elements, drawing them on an SVG canvas, and controlling their appearance.
-   [`state`](./state/codemap.md): Responsible for managing the application's state, primarily for persistence. It handles the serialization and deserialization of the application state so it can be saved and restored.

## Files

-   [`AppMain.js`](../../src/AppMain.js): The main entry point of the application. It initializes the application, manages the application state, and connects the different components like the editor, diagram, and scenario runners.
-   [`Editor.js`](../../src/Editor.js): Handles the Monaco editor setup, including the language definition for the 'scenaria' language.
-   [`ScenarioExecuter.js`](../../src/ScenarioExecuter.js): A base class for executing scenarios. It provides the logic for rendering scenario steps on the diagram.
-   [`ScenarioRunner.js`](../../src/ScenarioRunner.js): A `ScenarioExecuter` that runs a scenario completely without stopping.
-   [`ScenarioStepper.js`](../../src/ScenarioStepper.js): A `ScenarioExecuter` that runs a scenario step-by-step, allowing forward and backward navigation.
-   [`SystemModel.js`](../../src/SystemModel.js): Defines the data model for the application, including concepts like actors, channels, data flows, and scenarios. 