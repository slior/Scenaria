import './ScenariAppElement.css'
import {
    SHOW_NOTES_ATTR,
    SCENARIA_CHANGE_EVENT,
    SCENARIA_MOVE_EVENT,
    SCENARIA_READY_EVENT,
    SCENARIA_ERROR_EVENT
} from './scenaria-attrs.js'

const STATE_PARAM = 's'
const VIEWER_PAGE = 'viewer.html'

class ScenariAppElement extends HTMLElement {
    connectedCallback() {
        if (this.querySelector('#_vw')) return

        this.innerHTML = `
<div class="drawingWrap"><scenaria-viewer id="_vw" spacing="20"></scenaria-viewer></div>
<hr/>
<div class="wrapper">
  <div class="title-bar">Program</div>
  <div class="cmd"><scenaria-editor id="_ed"></scenaria-editor></div>
</div>
<p>
  <a href="https://github.com/slior/Scenaria/blob/master/README.md#usage" target="_blank">Usage</a>
  &nbsp;<a href="https://github.com/slior/Scenaria/blob/master/docs/CheatSheet.md" target="_blank">Syntax Cheat Sheet</a>
  &nbsp;<a href="https://github.com/slior/Scenaria/blob/master/docs/Language.md" target="_blank">Language Description</a>
</p>
<button type="button" id="_btnReset">Reset</button>
<button type="button" id="_btnApply">Apply</button>
<select id="_scenarioSelect" style="width:20%"></select>
<button type="button" id="_btnRun">Run Scenario</button>
<button type="button" id="_btnBack">&lt;</button>
<button type="button" id="_btnFwd">&gt;</button>
<br/><br/>
<input type="checkbox" id="_chkNotes"/><label for="_chkNotes">Notes</label>
<input type="number" id="_spacing" min="20" max="100" step="1" value="20" class="spacingInput"/>
<label for="_spacing">Spacing</label>
&nbsp;&nbsp;<a id="_shareLink">Share</a>
&nbsp;&nbsp;<a id="_viewLink">View Only</a>
<hr/>
<div id="_cons" class="consoleText"></div>
<span id="_err" class="errorText"></span>`

        this._vw = this.querySelector('#_vw')
        this._ed = this.querySelector('#_ed')
        this._scenarioSelect = this.querySelector('#_scenarioSelect')
        this._cons = this.querySelector('#_cons')
        this._err = this.querySelector('#_err')

        this._ed.addEventListener(SCENARIA_CHANGE_EVENT, e => {
            this._vw.setAttribute('spacing', this.querySelector('#_spacing').value)
            this._vw.code = e.detail.code
        })

        this._vw.addEventListener(SCENARIA_MOVE_EVENT, () => this._updateStateLink())
        this._vw.addEventListener(SCENARIA_READY_EVENT, () => this._updateStateLink())
        this._vw.addEventListener(SCENARIA_ERROR_EVENT, e => this._showError(e.detail.message))

        this.querySelector('#_btnReset').onclick = () => this._reset()
        this.querySelector('#_btnApply').onclick = () => this._parseAndDraw()
        this.querySelector('#_btnRun').onclick = () => this._runScenario()
        this.querySelector('#_btnBack').onclick = () => this._stepBack()
        this.querySelector('#_btnFwd').onclick = () => this._stepForward()
        this.querySelector('#_chkNotes').onchange = () => this._toggleNotes()
        this.querySelector('#_spacing').onchange = () => {
            this._vw.setAttribute('spacing', this.querySelector('#_spacing').value)
            if (this._vw.code) this._vw.code = this._vw.code
        }

        if (this.hasAttribute('code')) {
            const c = this.getAttribute('code')
            this._ed.setCode(c)
            this._vw.setAttribute('spacing', this.querySelector('#_spacing').value)
            this._vw.code = c
        }

        queueMicrotask(() => this._parseStateFromURL())
    }

    getViewer() {
        return this.querySelector('#_vw')
    }

    getEditor() {
        return this.querySelector('#_ed')
    }

    _showMsg(msg) {
        const m = msg || ''
        console.log(m)
        this._cons.innerHTML += m + '<br/>'
    }

    _showError(msg) {
        console.error(msg || '')
        this._err.innerText = msg || ''
    }

    _clearError() {
        this._err.innerText = ''
    }

    _clearConsole() {
        this._cons.innerText = ''
    }

    _setScenariosToSelect(scenarios) {
        if (!scenarios) throw new Error('No scenarios when setting scenarios selection')
        while (this._scenarioSelect.options.length > 0) this._scenarioSelect.remove(0)
        scenarios.forEach((scenario, ind) => {
            const opt = document.createElement('option')
            opt.value = String(ind)
            opt.innerHTML = scenario.name || `Scenario ${ind}`
            this._scenarioSelect.append(opt)
            opt.selected = ind === 0 // select the first scenario by default
        })
    }

    _clearScenarioSelection() {
        while (this._scenarioSelect.options.length > 0) this._scenarioSelect.remove(0)
    }

    _getCodeFromEditor() {
        return this._ed.getCode()
    }

    _parseAndDraw() {
        try {
            this._clearError()
            const code = this._getCodeFromEditor()
            this._vw.setAttribute('spacing', this.querySelector('#_spacing').value)
            this._vw.addEventListener(
                SCENARIA_READY_EVENT,
                e => {
                    this._setScenariosToSelect(e.detail.scenarios)
                    this._updateStateLink()
                    this._showMsg('Done.')
                },
                { once: true }
            )
            this._vw.addEventListener(SCENARIA_ERROR_EVENT, e => this._showError(e.detail.message), { once: true })
            this._vw.applyCode(code, { forceReset: true })
        } catch (err) {
            this._showError(err.toString())
        }
    }

    _viewURLFrom(currentURL, state) {
        const viewerURL = new URL(VIEWER_PAGE, currentURL.origin + currentURL.pathname.replace(/[^/]*$/, ''))
        if (state) viewerURL.searchParams.set(STATE_PARAM, state)
        return viewerURL
    }

    _updateStateLink() {
        try {
            const enc = this._vw.generateStateURLEncoding(this._getCodeFromEditor())
            const newURL = new URL(window.location.href)
            newURL.searchParams.set(STATE_PARAM, enc)
            this.querySelector('#_shareLink').href = newURL.toString()
            const currentURL = new URL(window.location.href)
            this.querySelector('#_viewLink').href = this._viewURLFrom(currentURL, enc).toString()
        } catch {
            this._resetStateLink()
        }
    }

    _resetStateLink() {
        const share = this.querySelector('#_shareLink')
        const view = this.querySelector('#_viewLink')
        const u = new URL(window.location.href)
        u.searchParams.delete(STATE_PARAM)
        share.href = u.toString()
        view.href = this._viewURLFrom(u).toString()
    }

    _reset() {
        try {
            this._vw.reset()
            this._clearError()
            this._clearConsole()
            this._clearScenarioSelection()
            this._resetStateLink()
        } catch (err) {
            this._showError(err.toString())
        }
    }

    _runScenario() {
        try {
            this._vw.runScenario(this._scenarioSelect.value, m => this._showMsg(m))
        } catch (err) {
            this._showError(err.toString())
        }
    }

    _stepBack() {
        try {
            this._vw.scenarioBack(this._scenarioSelect.value, m => this._showMsg(m))
        } catch (err) {
            this._showError(err.toString())
        }
    }

    _stepForward() {
        try {
            this._vw.scenarioNext(this._scenarioSelect.value, m => this._showMsg(m))
        } catch (err) {
            this._showError(err.toString())
        }
    }

    _toggleNotes() {
        const on = this.querySelector('#_chkNotes').checked
        this._vw.setAttribute(SHOW_NOTES_ATTR, on ? 'true' : 'false')
        try {
            if (on) this._vw.showNotes()
            else this._vw.hideNotes()
        } catch (err) {
            this._showError(err.toString())
        }
    }

    _parseStateFromURL() {
        const params = new URLSearchParams(window.location.search)
        if (params.has(STATE_PARAM)) {
            this._vw.addEventListener(
                SCENARIA_READY_EVENT,
                e => {
                    this._setScenariosToSelect(e.detail.scenarios)
                    this._updateStateLink()
                    this._showMsg('Model loaded.')
                    this._showMsg('Done, from URL.')
                },
                { once: true }
            )
            this._vw.addEventListener(SCENARIA_ERROR_EVENT, e => this._showError(e.detail.message), { once: true })
            this._vw.setStateFromURL(params.get(STATE_PARAM), {
                onCode: code => this._ed.setCode(code),
                onMove: () => this._updateStateLink()
            })
        } else {
            this._showMsg('No predefined state')
        }
    }
}

customElements.define('scenaria-app', ScenariAppElement)

export { ScenariAppElement }
