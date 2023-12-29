

# Scenaria

Scenaria is a small tool and language aimed at enabling collaboration in design discussions.
You can easily describe a system's high level structure and several scenarios (=[scenaria](https://en.wiktionary.org/wiki/scenaria)) in that system, play these scenarios and share with other colleagues.

## Design Goals

1. Easy and expressive - simple and intuitive syntax
2. Immediately see changes in the model.
3. Easily share and collaborate - a simple link to send.
4. Easy deployment - no need to set up a server, db, etc. The application is purely client side browser-based.
    - Can be run locally (but sharing the link requires the app to be served from somewhere).

----

## Usage

- Enter the description of the system you'd like to discuss in the editor at the bottom half of the screen.
    - See [Language Description](./docs/Language.md) for description of the syntax.
- Click 'Apply' to see the diagram and load the scenarios.
 - You can make changes and click 'Apply' again, or you can reset by clicking the 'Reset' button.
- You can layout the diagram (move nodes) for a more convenient view.
- You can select a scenario from the list given and click 'Run Scenario'.
    - Alternatively, you can click the left/right arrows to advance the selected scenario step by step
    - The log below the control panel outputs the progress of the scenario.
- If you want to share a link simply copy the link for the 'Share' (near the 'Apply' button) and send it.
----

## Development

The Scenaria tool is intentionally simple with minimal dependencies.
It is built in plain javascript, using node.js and webpack, so it is easily viewed and run in a browser.

Notable dependencies:
- The [monaco editor](https://microsoft.github.io/monaco-editor/) for providing editor functionality.
- [SVG.js](https://svgjs.dev/docs/3.0/) for drawing and manipulating SVG diagram.
- [elk.js](https://github.com/kieler/elkjs) for diagram layout.
- [ohm.js](https://ohmjs.org/) for creating the language compiler.