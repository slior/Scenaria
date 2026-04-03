

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
    - See the **[Features & Language Guide](./docs/3_Features.md)** for a full description of the syntax, UI, and language features. The original language specification can be found [here](./docs/Language.md).
- Click **Apply** to see the diagram and load the scenarios.
- You can make changes and click **Apply** again, or you can reset by clicking the **Reset** button.
- You can layout the diagram (move nodes) for a more convenient view.
- You can select a scenario from the list given and click **Run Scenario**.
    - Alternatively, you can click the left/right arrows to advance the selected scenario step by step
    - The log below the control panel outputs the progress of the scenario.
- If you want to share a link, copy the link for **Share** (near the **Apply** button) and send it.

----

## Embedding `scenaria-viewer` and `scenaria-app`

The UI is shipped as **custom elements** (Web Components). Building the library (`npm run build`) produces **`dist/scenaria.iife.js`**, **`dist/scenaria.es.js`**, and **`dist/scenaria.css`**. Load **both** a script and the stylesheet: the script registers the elements, and the CSS covers the editor and layout chrome (CodeMirror, `scenaria-app` regions, and related UI).

| Element | Purpose |
|--------|---------|
| **`<scenaria-viewer>`** | Renders the diagram and scenarios only—no built-in editor. You supply source text via the `code` attribute or the `.code` property. |
| **`<scenaria-app>`** | Full experience: editor, diagram, scenario controls, share/view links, and console—similar to the default `index.html` app. |

Common **attributes** (viewer): `code` (program text), `spacing` (layout spacing, number, default `20`), `show-notes` (`true` or empty to show notes). The **`<scenaria-app>`** element can take an initial `code` attribute.

Useful **events** on the viewer (bubbling): `scenaria-ready` (detail includes `scenarios` and `model`), `scenaria-error` (detail `message`), `scenaria-move` (after interactive node moves). The editor inside the app emits `scenaria-change` when the document changes (debounced).

---

### Example 1 — *Nova Help Center* (static HTML, diagram only)

A documentation site hosts the two `dist/` assets next to its pages and drops in a viewer. Program text is assigned from JavaScript (here, a short inline example).

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Nova — Sequence preview</title>
  <link rel="stylesheet" href="/assets/scenaria.css" />
  <script src="/assets/scenaria.iife.js"></script>
  <style>
    scenaria-viewer { display: block; height: 420px; border: 1px solid #ccc; }
  </style>
</head>
<body>
  <h1>Checkout flow</h1>
  <scenaria-viewer id="checkout" spacing="24" show-notes="true"></scenaria-viewer>
  <script>
    const el = document.getElementById('checkout')
    el.code = String.raw`
agent 'Browser' as b
agent 'API' as a
'purchase' {
  b -('POST /cart')-> a
  a -('201')-> b
}
`
    el.addEventListener('scenaria-ready', (e) => {
      console.log('Nova: scenarios loaded', e.detail.scenarios.map(s => s.name))
    })
    el.addEventListener('scenaria-error', (e) => {
      console.warn('Nova: diagram error', e.detail.message)
    })
  </script>
</body>
</html>
```

---

### Example 2 — *Meridian Console* (bundled app with ES modules)

A small internal tool built with Vite copies `scenaria.es.js` and `scenaria.css` into `public/vendor/` (or installs the published npm package and resolves the same files from `node_modules`). The module import runs once so the custom elements are defined.

`<scenaria-app>` reads a **`code` attribute only when it first connects**, so if you load initial text from `sessionStorage` or an API, wait for the element to be defined, then push text through **`getEditor()`** and **`getViewer().applyCode()`** (same idea as typing in the editor and clicking **Apply**).

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Meridian — Scenaria workspace</title>
  <link rel="stylesheet" href="/vendor/scenaria.css" />
</head>
<body>
  <scenaria-app id="workspace"></scenaria-app>
  <script type="module">
    import '/vendor/scenaria.es.js'

    await customElements.whenDefined('scenaria-app')
    const app = document.getElementById('workspace')
    const saved =
      sessionStorage.getItem('meridian.scenaria') ??
      String.raw`
agent 'Gateway' as g
agent 'Service' as s
'health' { g -('ping')-> s }
`
    app.getEditor().setCode(saved)
    app.getViewer().applyCode(saved, { forceReset: true })
  </script>
</body>
</html>
```

---

### Example 3 — *Cortex design portal* (viewer + REST-loaded programs)

Cortex embeds a viewer in a shadow DOM shell and loads `.scenaria` files from their API. They reuse the same bundle the rest of the portal loads once on boot.

```javascript
// cortex-scenaria-panel.js — loaded as a module in Cortex’s shell
import '/static/packages/scenaria.es.js'

const SCENARIA_CSS = '/static/packages/scenaria.css'

export async function mountScenariaPanel(hostEl, { docUrl }) {
  const root = hostEl.attachShadow({ mode: 'open' })
  root.innerHTML = `
    <link rel="stylesheet" href="${SCENARIA_CSS}" />
    <scenaria-viewer id="diagram" spacing="20"></scenaria-viewer>
  `
  const viewer = root.getElementById('diagram')
  const res = await fetch(docUrl, { headers: { Accept: 'text/plain' } })
  if (!res.ok) throw new Error('Cortex: failed to load ' + docUrl)
  viewer.code = await res.text()
  return viewer
}
```

Usage from their (imaginary) router:

```javascript
const panel = await mountScenariaPanel(document.querySelector('#design-slot'), {
  docUrl: '/api/v2/repos/billing/design/checkout.scenaria'
})
panel.addEventListener('scenaria-ready', () => {
  // Cortex: enable “Share fragment” UI, etc.
})
```

---

For a minimal shipped demo of **`scenaria-viewer`** with the IIFE bundle only, see [`examples/iife-demo.html`](./examples/iife-demo.html).

----

## Development

The Scenaria tool is intentionally simple with minimal dependencies.
It is built in plain JavaScript with [Node.js](https://nodejs.org/) and [Vite](https://vitejs.dev/) (library build + dev server), so it is easy to run in the browser during development and to ship static assets.

- **Install:** `npm install`
- **Dev server (source modules):** `npm run dev` — serves `index.html`, which loads the app from `src/`.
- **Production bundle:** `npm run build` — writes `dist/scenaria.es.js`, `dist/scenaria.iife.js`, and `dist/scenaria.css`.

For a deeper understanding of the codebase, consult the full documentation:

- **[Codebase Discovery](./docs/1_Discovery.md)**: A high-level map of the source code.
- **[Architecture Deep Dive](./docs/2_Architecture.md)**: An explanation of the system design and data flows.
- **[Development & Operations](./docs/4_Operations.md)**: A guide to building, testing, and maintaining the application.

## Docker Deployment

The simplest way to run the full **scenaria-app** UI in a container is with Docker. The image builds the IIFE bundle and serves it with nginx (see `docker/index.html`).

1. **Build the Docker image:**
    ```bash
    docker build -t scenaria-app .
    ```

2. **Run the container:**
    ```bash
    docker run -p 8080:80 scenaria-app
    ```

You can then access the application at [http://localhost:8080](http://localhost:8080).

The standalone **viewer** page (`viewer.html`, URL-based diagram state) is set up for `npm run dev` and is not included in this image.

## Notable dependencies

- **[CodeMirror 6](https://codemirror.net/)** (`@codemirror/*`, `@lezer/highlight`) — text editor, syntax highlighting, and editing commands.
- **[SVG.js](https://svgjs.dev/docs/3.0/)** (`@svgdotjs/svg.js`) — drawing and manipulating the diagram SVG.
- **[elkjs](https://github.com/kieler/elkjs)** — layered graph layout for the diagram.
- **[Ohm](https://ohmjs.org/)** (`ohm-js`) — parsing and semantics for the Scenaria language.
- **[fflate](https://github.com/101arrowz/fflate)** — compact encoding of shareable diagram state in URLs.
