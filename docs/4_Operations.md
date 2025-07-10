# Operations & Maintenance

This document provides guidance on deploying, building, testing, and maintaining the Scenaria application.

## 1. Deployment

As a purely client-side application, Scenaria requires no backend infrastructure. Deployment is as simple as serving the contents of the project's root directory with any static web server.

**Example using a simple Python server:**
```bash
# From the project root directory
python3 -m http.server 8000
```
Then, access the application at `http://localhost:8000`.

The key files that need to be served are:
- `index.html`
- `main.js` (the bundled application code)
- `viewer.html`
- Other assets like `favicon.png`

## 2. Local Development

To run the application locally for development, you will need Node.js and npm installed.

**1. Install Dependencies**:
```bash
npm install
```

**2. Start the Development Server**:
The project is configured with `webpack-dev-server`, which provides live-reloading. (Note: This was mentioned in `techContext.md` but is not in `package.json`. If it were, the command would be `npm start`).

To simply build the code after making changes, run:
```bash
npm run build
```
This command uses `webpack` to bundle all source files, starting from `src/AppMain.js`, into a single `main.js` file in the root directory.

## 3. Testing

The project uses [Mocha](https://mochajs.org/) as its testing framework. Tests are located in the `/test` directory.

To run the test suite, execute the following command:
```bash
npm test
```
This will run all files ending in `.js` within the `/test` directory.

## 4. Troubleshooting

- **Parsing Errors**: If the Scenaria code is invalid, the diagram will not render. Check the browser's developer console for parsing errors originating from the `Lang.js` or `scenaria.ohm.js` modules. The UI should also display a parsing error message.
- **Diagram Layout Issues**: If the diagram looks incorrect or fails to render, check the console for errors from `elkjs` or the `DiagDraw.js` module. The layout engine runs in a web worker, so errors might be logged with a "worker" context.
- **Scenario Execution Errors**: If a scenario does not run as expected, use the "Step" button to execute it one step at a time to isolate the failing step. Check the console for errors from the `ScenarioExecuter.js` module.

## 5. Dependency Management

Project dependencies are managed via `npm` and are defined in `package.json`.

- **To Check for Outdated Dependencies**:
  ```bash
  npm outdated
  ```
- **To Update a Dependency**:
  1. Update the version number in `package.json`.
  2. Run `npm install` to download the new version.
  3. Run the test suite (`npm test`) to ensure the update has not introduced breaking changes.
  4. Manually test the application's core functionality.

Due to the minimal nature of the project, dependencies should be updated with care, as a breaking change in a core library (like `elkjs` or `ohm-js`) could have a significant impact. 