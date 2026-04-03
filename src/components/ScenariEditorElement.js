import { getLanguageKeywords } from '../lang/Lang.js'
import { createEditor } from '../Editor.js'
import { SCENARIA_CHANGE_EVENT } from './scenaria-attrs.js'

function debounce(fn, ms) {
    let t = 0
    return (...args) => {
        clearTimeout(t)
        t = setTimeout(() => fn(...args), ms)
    }
}

class ScenariEditorElement extends HTMLElement {
    static get observedAttributes() {
        return ['code', 'readonly']
    }

    constructor() {
        super()
        this._api = null
        this._debouncedEmit = debounce(code => {
            this.dispatchEvent(new CustomEvent(SCENARIA_CHANGE_EVENT, { detail: { code }, bubbles: true }))
        }, 200)
    }

    connectedCallback() {
        if (this._api) return
        this._editorDiv = document.createElement('div')
        this._editorDiv.style.height = '100%'
        this._editorDiv.style.minHeight = '120px'
        this.appendChild(this._editorDiv)

        const initial = this.getAttribute('code') || ''
        const readonly = this.hasAttribute('readonly')
        this._api = createEditor(this._editorDiv, getLanguageKeywords(), {
            initialDoc: initial,
            readOnly: readonly,
            onDocChange: code => {
                if (!readonly) this._debouncedEmit(code)
            }
        })
    }

    disconnectedCallback() {
        if (this._api) {
            this._api.destroy()
            this._api = null
        }
    }

    attributeChangedCallback(name, _old, val) {
        if (!this._api) return
        if (name === 'code' && val != null) this._api.setCode(val)
    }

    getCode() {
        if (!this._api) return ''
        return this._api.getCode()
    }

    setCode(v) {
        if (!this._api) return
        this._api.setCode(v == null ? '' : String(v))
    }
}

customElements.define('scenaria-editor', ScenariEditorElement)

export { ScenariEditorElement }
