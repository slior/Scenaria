import { ScenariaDiagram } from '../ScenariaDiagram.js'
import { newLayoutOptionsFromInputs } from '../diagram/DiagDraw.js'
import {
    SHOW_NOTES_ATTR,
    SCENARIA_READY_EVENT,
    SCENARIA_ERROR_EVENT,
    SCENARIA_MOVE_EVENT
} from './scenaria-attrs.js'

class ScenariViewerElement extends HTMLElement {
    static get observedAttributes() {
        return ['code', 'spacing', SHOW_NOTES_ATTR]
    }

    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this._diagram = null
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        #container {
          width: 100%;
          height: 100%;
          min-height: 120px;
          background: var(--scenaria-bg, #fff);
        }
        .drawingSVG {
          height: 800px;
          width: 100%;
          user-select: none;
        }
      </style>
      <div id="container"></div>`
        const container = this.shadowRoot.getElementById('container')
        this._diagram = new ScenariaDiagram(container)
        if (this.hasAttribute('code')) this._applyCode(this.getAttribute('code'))
    }

    disconnectedCallback() {
        if (this._diagram) {
            this._diagram.reset()
            this._diagram = null
        }
    }

    attributeChangedCallback(name, _old, val) {
        if (!this._diagram) return
        if (name === 'code' && val != null) this._applyCode(val)
        if (name === 'spacing' && this.hasAttribute('code')) this._applyCode(this.getAttribute('code'))
        if (name === SHOW_NOTES_ATTR) this._syncNotes()
    }

    _spacing() {
        const v = parseInt(this.getAttribute('spacing') || '20', 10)
        return Number.isFinite(v) ? v : 20
    }

    _layoutOpts() {
        return newLayoutOptionsFromInputs(this._spacing())
    }

    _applyCode(code) {
        if (code == null) return
        const c = String(code)
        this._diagram.reset()
        this._diagram
            .parseAndPresent(c, () => this.dispatchEvent(new CustomEvent(SCENARIA_MOVE_EVENT, { bubbles: true })), this._layoutOpts())
            .then(model => {
                this.dispatchEvent(
                    new CustomEvent(SCENARIA_READY_EVENT, {
                        detail: { scenarios: model.scenarios, model },
                        bubbles: true
                    })
                )
                this._syncNotes()
            })
            .catch(err =>
                this.dispatchEvent(
                    new CustomEvent(SCENARIA_ERROR_EVENT, {
                        detail: { message: err.message },
                        bubbles: true
                    })
                )
            )
    }

    _syncNotes() {
        const v = this.getAttribute(SHOW_NOTES_ATTR)
        const show = v === 'true' || v === ''
        try {
            if (show) this._diagram.displayNotes()
            else this._diagram.hideNotes()
        } catch {
            /* model may be missing */
        }
    }

    set code(v) {
        if (v == null) this.removeAttribute('code')
        else this.setAttribute('code', v)
    }

    get code() {
        return this.getAttribute('code')
    }

    /**
     * @param {string} encoded
     * @param {{ onCode?: (code: string) => void, onMove?: () => void }} [options]
     */
    setStateFromURL(encoded, options = {}) {
        if (!this._diagram) return
        const { onCode = () => {}, onMove = () => {} } = options
        try {
            const model = this._diagram.setStateFromURL(encoded, onCode, onMove)
            this.dispatchEvent(
                new CustomEvent(SCENARIA_READY_EVENT, {
                    detail: { scenarios: model.scenarios, model },
                    bubbles: true
                })
            )
            this._syncNotes()
        } catch (err) {
            this.dispatchEvent(
                new CustomEvent(SCENARIA_ERROR_EVENT, {
                    detail: { message: err.message },
                    bubbles: true
                })
            )
        }
    }

    /** @param {string} code */
    generateStateURLEncoding(code) {
        if (!this._diagram) throw new Error('Diagram not ready')
        return this._diagram.generateStateURLEncoding(code)
    }

    runScenario(index, messageCB) {
        this._diagram.runScenario(Number(index), messageCB)
    }

    scenarioNext(index, messageCB) {
        this._diagram.scenarioNext(Number(index), messageCB)
    }

    scenarioBack(index, messageCB) {
        this._diagram.scenarioBack(Number(index), messageCB)
    }

    reset() {
        this._diagram.reset()
    }

    showNotes() {
        this._diagram.displayNotes()
    }

    hideNotes() {
        this._diagram.hideNotes()
    }

    getDiagram() {
        return this._diagram
    }
}

customElements.define('scenaria-viewer', ScenariViewerElement)

export { ScenariViewerElement }
