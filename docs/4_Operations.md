# Operations & Maintenance

This document provides guidance on deploying, building, testing, and maintaining the Scenaria application.

## 1. Deployment

As a purely client-side application, Scenaria requires no backend infrastructure. How you deploy depends on whether you ship the **development** entry (`index.html` importing `src/`) or a **built** bundle (`dist/scenaria.iife.js` + HTML that loads it, as in `docker/index.html`).

### Using Docker (recommended for a production-style bundle)

The `Dockerfile` runs `npm run build` and serves `docker/index.html` plus the contents of `dist/` with nginx.

1. **Build the image:**
   ```bash
   docker build -t scenaria-app .
   ```

2. **Run the container:**
   ```bash
   docker run -p 8080:80 scenaria-app
   ```

This serves the full **scenaria-app** UI at `http://localhost:8080`. The standalone **viewer** page (`viewer.html`) is intended for use with `npm run dev` and is not part of this image.

### Local development server

From the project root, with dependencies installed:

```bash
npm run dev
```

This starts the Vite dev server so `index.html` and `viewer.html` can load ES modules from `src/`.

### Plain static server (built assets only)

If you only run `python3 -m http.server` (or any static host) on the repo root **without** Vite, the default `index.html` will not work (it references `/src/...`). Use a small HTML page that loads `./dist/scenaria.iife.js` and `./dist/scenaria.css` (see `docker/index.html` or `examples/iife-demo.html`).

## 2. Local development

You need [Node.js](https://nodejs.org/) and npm.

**1. Install dependencies:**

```bash
npm install
```

**2. Run the dev server:**

```bash
npm run dev
```

**3. Build production bundles:**

```bash
npm run build
```

This runs **Vite** in library mode. Output is under `dist/`: `scenaria.es.js`, `scenaria.iife.js`, and `scenaria.css` (see `vite.config.js`).

## 3. Testing

Tests live in the `/test` directory and are run with **[Vitest](https://vitest.dev/)** (configured in `vite.config.js`).

```bash
npm test
```

For watch mode:

```bash
npm run test:watch
```

## 4. Troubleshooting

- **Parsing errors**: If the Scenaria source is invalid, the diagram will not render. Check the browser console for errors from the language/parser modules (`Lang.js`, grammar). The UI should also surface a parsing error when applicable.
- **Diagram layout issues**: Check the console for errors from `elkjs` or `DiagDraw.js`. Layout runs on the main thread via `elkjs` in the current codebase.
- **Scenario execution errors**: Step through with the arrow controls to isolate the failing step. Check the console for errors from scenario execution code (e.g. `ScenarioExecuter.js`).

## 5. Dependency management

Dependencies are defined in `package.json`.

- **Check for outdated packages:**
  ```bash
  npm outdated
  ```
- **Update a dependency:** change the version in `package.json`, run `npm install`, then `npm test` and smoke-test the app.

Core libraries (`elkjs`, `ohm-js`, CodeMirror, SVG.js) warrant extra care when upgrading.
