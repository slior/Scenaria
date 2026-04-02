---
name: Components Rewrite Plan
overview: Detailed, file-level implementation plan for the 5-step incremental extraction of Scenaria into standalone Web Components, following the spec in `tmp/plans/components-rewrite.md`.
todos:
  - id: step1-codemirror
    content: "Step 1: Replace Monaco with CodeMirror 6 — rewrite Editor.js, remove lib/monaco-editor, update index.html wiring"
    status: completed
  - id: step2-singleton
    content: "Step 2: Extract ScenariaDiagram class from AppMain.js, fix ScenarioStepper index-0 bug, update index.html/viewer.html to use instance API"
    status: completed
  - id: step3-components
    content: "Step 3: Build ScenariViewerElement, ScenariEditorElement, ScenariAppElement Web Components in src/components/"
    status: completed
  - id: step4-vite
    content: "Step 4: Replace zlib with fflate in State.js, convert CJS→ESM, replace webpack with Vite, produce dual ESM+IIFE build"
    status: completed
  - id: step5-html
    content: "Step 5: Rebuild index.html and viewer.html as thin shells using the new components"
    status: completed
isProject: false
---

# Scenaria Web Components — Implementation Plan

> **All five steps below are implemented in the repository.** Section headings are marked **✅ COMPLETED** where work was done. The “Codebase Snapshot” describes the pre-refactor layout for context.

## Codebase Snapshot

_(Historical reference only — roles changed after the refactor; see source tree.)_

Key files and their roles:

- `[src/AppMain.js](src/AppMain.js)` — orchestration hub; holds singleton `appState`; exposes all public API as a webpack `var` global (`window.main`)
- `[src/Editor.js](src/Editor.js)` — loaded as a **classic `<script>` tag** (not bundled); exposes globals `initEditor`, `getCode`, `setCode` via Monaco AMD loader
- `[src/ScenariaDiagram.js](src/ScenariaDiagram.js)` — does not exist yet; will be created in Step 2
- `[src/diagram/DiagDraw.js](src/diagram/DiagDraw.js)` — `layoutModel(model, opts)` (async) + `drawGraph(svg, graph, cb)` — returns `DiagramPainter`
- `[src/diagram/DiagramController.js](src/diagram/DiagramController.js)` — decorates SVG elements; receives `svgElements` map from `DiagramPainter`
- `[src/state/State.js](src/state/State.js)` — URL serialization using Node's `zlib.deflateSync`/`inflateSync` — **must be replaced before Vite**
- `[src/ScenarioStepper.js](src/ScenarioStepper.js)` — has a known bug: `if (!scenarioInd || scenarioInd < 0)` rejects index `0`; fix in Step 2

---

## Step 1 — Replace Monaco with CodeMirror 6 — ✅ COMPLETED

**Goal:** CodeMirror 6 replaces Monaco. `index.html` continues to work with no other changes.

### 1.1 Remove Monaco — ✅ COMPLETED

- Delete `./lib/monaco-editor/` directory
- Remove `monaco-editor` from `package.json` dependencies
- In `[index.html](index.html)`: remove the two Monaco script tags:

```html
  <!-- DELETE these two lines -->
  <script src="./lib/monaco-editor/min/vs/loader.js"></script>
  <script src="./src/Editor.js"></script>
  

```

### 1.2 Install CodeMirror 6 — ✅ COMPLETED

```bash
npm install @codemirror/state @codemirror/view @codemirror/commands \
            @codemirror/language @codemirror/theme-one-dark \
            @lezer/highlight
```

### 1.3 Rewrite `src/Editor.js` as a CommonJS module — ✅ COMPLETED

_(Delivered as ESM: `src/Editor.js` uses `import`/`export`; full CJS→ESM migration is Step 4.)_

New shape — same external contract (`initEditor`, `getCode`, `setCode`), CodeMirror 6 internals:

```js
const { EditorState } = require('@codemirror/state');
const { EditorView, keymap, lineNumbers } = require('@codemirror/view');
const { defaultKeymap, historyKeymap, history } = require('@codemirror/commands');
const { StreamLanguage, HighlightStyle, syntaxHighlighting } = require('@codemirror/language');
const { oneDark } = require('@codemirror/theme-one-dark');

// Port Monaco Monarch rules → CodeMirror StreamLanguage
function createScenariaLanguage(keywords) { ... }

let view = null;

function initEditor(container, readyCB, keywords) {
  const state = EditorState.create({
    doc: '',
    extensions: [
      history(), keymap.of([...defaultKeymap, ...historyKeymap]),
      lineNumbers(),
      oneDark,
      StreamLanguage.define(createScenariaLanguage(keywords)),
    ]
  });
  view = new EditorView({ state, parent: container });
  if (readyCB) readyCB();
}

function getCode() { ... }
function setCode(code) { ... }

module.exports = { initEditor, getCode, setCode };
```

### 1.4 Wire editor into AppMain.js — ✅ COMPLETED

Add to `[src/AppMain.js](src/AppMain.js)` exports:

```js
const { initEditor, getCode, setCode } = require('./Editor');
module.exports = { ..., initEditor, getCode, setCode };
```

### 1.5 Update `index.html` — ✅ COMPLETED

_(Superseded by Step 5: `index.html` is a thin shell loading `<scenaria-app>` via Vite.)_

Replace global `initEditor(...)` / `getCode()` / `setCode(...)` calls with `main.initEditor(...)` etc. The `<script src="./src/Editor.js">` tag is removed (editor is now in the bundle).

### Verify Step 1 — ✅ COMPLETED

- `npm run build && open index.html` — editor loads, code can be typed, Apply renders diagram
- **Verified:** `npm run build` succeeds; use `npm run dev` and open `/` for full editor + diagram via `<scenaria-app>`.

---

## Step 2 — Remove the Singleton from `AppMain.js` — ✅ COMPLETED

**Goal:** `appState` moves into a class. Multiple diagrams can coexist on one page.

### 2.1 Create `src/ScenariaDiagram.js` — ✅ COMPLETED

New class encapsulating everything currently in `appState` + all `AppMain.js` functions:

```js
class ScenariaDiagram {
  constructor(container) {
    this._container = container;
    this._svg = null;
    this._controller = null;
    this._model = null;
    this._stepper = null;
    this._graph = null;
  }

  parseAndPresent(code, moveCB, layoutInputs) { ... }
  runScenario(index, messageCB) { ... }
  scenarioNext(index, messageCB) { ... }
  scenarioBack(index, messageCB) { ... }
  reset() { ... }
  generateStateURLEncoding(code) { ... }
  setStateFromURL(stateParam, codeCB, moveCB) { ... }
  showNotes() { ... }
  hideNotes() { ... }
}

module.exports = { ScenariaDiagram };
```

### 2.2 Fix `ScenarioStepper` bug — ✅ COMPLETED

In `[src/ScenarioStepper.js](src/ScenarioStepper.js)`, line with `if (!scenarioInd || scenarioInd < 0)`:

```js
// Before (rejects index 0):
if (!scenarioInd || scenarioInd < 0)
// After:
if (scenarioInd == null || scenarioInd < 0)
```

### 2.3 Slim down `AppMain.js` — ✅ COMPLETED

`AppMain.js` becomes a thin re-export shim for backwards compatibility with `index.html`/`viewer.html`:

```js
const { ScenariaDiagram } = require('./ScenariaDiagram');
const { getLanguageKeywords } = require('./lang/Lang');
const { initEditor, getCode, setCode } = require('./Editor');
const { newLayoutOptionsFromInputs } = require('./diagram/DiagDraw');

module.exports = {
  createScenariaDiagram: (container) => new ScenariaDiagram(container),
  getLanguageKeywords,
  initEditor, getCode, setCode,
  layoutOptionsFromInputs: newLayoutOptionsFromInputs,
};
```

### 2.4 Update `index.html` and `viewer.html` — ✅ COMPLETED

_(Final wiring is the Step 5 component-based pages; logic lives in `<scenaria-app>` / viewer script.)_

```js
// Before:
main.initApp(drawingBoard);
main.parseAndPresent(code, cb, opts);

// After:
const diagram = main.createScenariaDiagram(drawingBoard);
diagram.parseAndPresent(code, cb, opts);
```

All other calls (`runScenario`, `reset`, `scenarioNext`, etc.) also move to the `diagram` instance.

### Verify Step 2 — ✅ COMPLETED

- Existing app still works
- Open two `<div>` containers side-by-side, create two `ScenariaDiagram` instances with different code — both render independently
- **Verified:** `ScenariaDiagram` is per-instance; `npm test` passes.

---

## Step 3 — Build the Web Components — ✅ COMPLETED

**Goal:** Three custom elements implemented and usable.

### 3.1 Create `src/components/ScenariViewerElement.js` — ✅ COMPLETED

Shadow DOM. Uses `ScenariaDiagram` internally.

```js
class ScenariViewerElement extends HTMLElement {
  static get observedAttributes() { return ['code', 'spacing', 'show-notes']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._diagram = null;
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        #container { width: 100%; height: 100%;
          background: var(--scenaria-bg, #fff); }
        /* ... CSS custom property defaults ... */
      </style>
      <div id="container"></div>`;
    this._diagram = new ScenariaDiagram(this.shadowRoot.getElementById('container'));
    if (this.hasAttribute('code')) this._applyCode(this.getAttribute('code'));
  }

  attributeChangedCallback(name, _old, val) {
    if (name === 'code' && this._diagram) this._applyCode(val);
    // spacing, show-notes...
  }

  set code(v) { this.setAttribute('code', v); }
  get code() { return this.getAttribute('code'); }

  _applyCode(code) {
    this._diagram.reset();
    this._diagram.parseAndPresent(code, null, { spacing: this._spacing() })
      .then(model => this.dispatchEvent(new CustomEvent('scenaria-ready',
        { detail: { scenarios: model.scenarios }, bubbles: true })))
      .catch(err => this.dispatchEvent(new CustomEvent('scenaria-error',
        { detail: { message: err.message }, bubbles: true })));
  }

  stepNext(messageCB) { this._diagram.scenarioNext(this._activeScenario, messageCB); }
  stepBack(messageCB) { this._diagram.scenarioBack(this._activeScenario, messageCB); }
  runScenario(index, messageCB) { this._diagram.runScenario(index, messageCB); }
  reset() { this._diagram.reset(); }
}

customElements.define('scenaria-viewer', ScenariViewerElement);
```

### 3.2 Create `src/components/ScenariEditorElement.js` — ✅ COMPLETED

Light DOM (no `attachShadow`). CodeMirror requires document-level access.

```js
class ScenariEditorElement extends HTMLElement {
  static get observedAttributes() { return ['code', 'theme', 'readonly']; }

  connectedCallback() {
    this._editorDiv = document.createElement('div');
    this.appendChild(this._editorDiv);
    const { initEditor } = require('../Editor');
    initEditor(this._editorDiv, null, getLanguageKeywords());
    if (this.hasAttribute('code')) this.setCode(this.getAttribute('code'));
    // attach change listener → debounced scenaria-change event dispatch
  }

  getCode() { /* delegate to Editor.getCode */ }
  setCode(v) { /* delegate to Editor.setCode */ }
}

customElements.define('scenaria-editor', ScenariEditorElement);
```

Note: Because CodeMirror is instance-based (Step 1 changes `view` to be per-element), the Editor module will need a small refactor to return an editor instance rather than closing over a single `view`. Each `ScenariEditorElement` owns its own `EditorView` instance.

### 3.3 Create `src/components/ScenariAppElement.js` — ✅ COMPLETED

Composes the two elements, wires events internally:

```js
class ScenariAppElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <scenaria-editor id="_ed"></scenaria-editor>
      <scenaria-viewer id="_vw"></scenaria-viewer>`;
    const ed = this.querySelector('#_ed');
    const vw = this.querySelector('#_vw');
    ed.addEventListener('scenaria-change', e => { vw.code = e.detail.code; });
    if (this.hasAttribute('code')) {
      ed.setCode(this.getAttribute('code'));
      vw.code = this.getAttribute('code');
    }
  }
}

customElements.define('scenaria-app', ScenariAppElement);
```

### 3.4 Create `src/components/index.js` — ✅ COMPLETED

```js
require('./ScenariViewerElement');
require('./ScenariEditorElement');
require('./ScenariAppElement');
```

### Verify Step 3 — ✅ COMPLETED

- Create a test HTML page that uses `<scenaria-viewer>` with a `code` attribute, confirms diagram renders
- Create a test page using `<scenaria-app>`, confirms editor changes re-render the viewer
- **Verified:** `index.html` / `viewer.html` under Vite; optional `examples/iife-demo.html` for `dist/scenaria.iife.js`.

---

## Step 4 — Switch to Vite + Fix `zlib` — ✅ COMPLETED

**Goal:** Dual-output library build (ESM + IIFE). `State.js` works in the browser.

### 4.1 Fix `State.js` — replace `zlib` with `fflate` — ✅ COMPLETED

`zlib` is a Node.js built-in; Vite does not polyfill it.

```bash
npm install fflate
```

In `[src/state/State.js](src/state/State.js)`:

```js
// Before:
const zlib = require('zlib');
// ...deflate: zlib.deflateSync(buffer)
// ...inflate: zlib.inflateSync(buffer)

// After:
const { deflateSync, inflateSync, strToU8, strFromU8 } = require('fflate');
// API is essentially the same shape; adapt buffer/string handling
```

`fflate` is ~10KB, pure JS, browser-native, no Node dependency.

### 4.2 Convert modules to ES module syntax — ✅ COMPLETED

Vite works best with ESM. Convert `require`/`module.exports` → `import`/`export` across all files in `src/`. This is mostly mechanical.

Key files to update:

- `src/AppMain.js`, `src/ScenariaDiagram.js`, `src/Editor.js`
- `src/diagram/*.js`, `src/lang/Lang.js`, `src/state/State.js`
- `src/ScenarioRunner.js`, `src/ScenarioStepper.js`, `src/ScenarioExecuter.js`, `src/SystemModel.js`
- `src/components/*.js`

### 4.3 Install Vite and remove webpack — ✅ COMPLETED

```bash
npm remove webpack webpack-cli
npm install --save-dev vite
```

### 4.4 Create `vite.config.js` — ✅ COMPLETED

```js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/components/index.js',
      name: 'Scenaria',
      formats: ['es', 'iife'],
      fileName: (format) => `scenaria.${format}.js`
    }
  }
});
```

### 4.5 Update `package.json` — ✅ COMPLETED

```json
{
  "type": "module",
  "main": "./dist/scenaria.iife.js",
  "module": "./dist/scenaria.es.js",
  "exports": { ".": { "import": "./dist/scenaria.es.js" } },
  "files": ["dist"],
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  }
}
```

### Verify Step 4 — ✅ COMPLETED

- `npm run build` produces `dist/scenaria.es.js` and `dist/scenaria.iife.js`
- Create a plain HTML test page loading the IIFE from `dist/`, confirm `<scenaria-viewer>` renders
- `npm run dev` serves the app in watch mode
- **Verified:** `npm run build` and `npm test` (Vitest) succeed; see `examples/iife-demo.html`.

---

## Step 5 — Rebuild `index.html` and `viewer.html` — ✅ COMPLETED

**Goal:** Both pages rebuilt as thin HTML shells using the components.

### 5.1 Rewrite `index.html` — ✅ COMPLETED

```html
<script type="module" src="/src/components/index.js"></script>

<scenaria-app id="app"></scenaria-app>
<a id="shareLink">Share</a>
<a id="viewLink">View Only</a>

<script type="module">
  const app = document.getElementById('app');
  // URL state: read/write using app.getViewer().generateStateURLEncoding(...)
  // Share link: same logic as today, delegated to component
</script>
```

Remove all inline imperative script logic — scenario selection, error display, notes toggle — these move into `<scenaria-app>` internals.

### 5.2 Rewrite `viewer.html` — ✅ COMPLETED

```html
<script type="module" src="/src/components/index.js"></script>

<scenaria-viewer id="viewer"></scenaria-viewer>
<!-- scenario controls: stepBack, stepForward, runScenario -->

<script type="module">
  const params = new URLSearchParams(window.location.search);
  const viewer = document.getElementById('viewer');
  if (params.has('s')) {
    viewer.setStateFromURL(params.get('s'));
  }
</script>
```

### 5.3 Expose URL state API on `ScenariViewerElement` — ✅ COMPLETED

`<scenaria-viewer>` needs to expose `setStateFromURL(encoded)` as a method, delegating to the internal `ScenariaDiagram` instance.

### Verify Step 5 — ✅ COMPLETED

- `npm run dev` — full app works via `index.html`; viewer works via `viewer.html`
- Share link generates a URL; viewer page loads and renders from URL
- `npm run build` — IIFE bundle includes all components; test HTML page loading from `dist/` works
- **Verified:** Share/view links and URL `?s=` handling are implemented in `ScenariAppElement` and `viewer.html` script; `setStateFromURL` / `generateStateURLEncoding` on `<scenaria-viewer>`.

---

## File Map: What Changes Where

**✅ Table below reflects completed implementation.**

| File                     | Action                                              |
| ------------------------ | --------------------------------------------------- |
| `src/AppMain.js`         | Slimmed to re-export shim                           |
| `src/Editor.js`          | Rewritten (CodeMirror 6, instance-based, ES module) |
| `src/ScenariaDiagram.js` | **New** — extracted from AppMain                    |
| `src/state/State.js`     | `zlib` → `fflate`                                   |
| `src/ScenarioStepper.js` | Bug fix on index 0 check                            |
| `src/components/`        | **New directory** — 4 new files                     |
| `webpack.config.js`      | Deleted                                             |
| `vite.config.js`         | **New**                                             |
| `index.html`             | Rewritten in Step 5                                 |
| `viewer.html`            | Rewritten in Step 5                                 |
| `lib/monaco-editor/`     | Deleted                                             |
| All `src/**/*.js`        | CJS → ESM conversion in Step 4                      |
| `src/diagram/*.js`       | Unchanged (logic preserved)                         |
| `src/lang/*.js`          | Unchanged (logic preserved)                         |
| `src/SystemModel.js`     | Unchanged (logic preserved)                         |


