import { SVG } from '@svgdotjs/svg.js'
import { createParser } from './lang/Lang.js'
import { layoutModel, drawGraph, newLayoutOptionsFromInputs } from './diagram/DiagDraw.js'
import { DiagramController } from './diagram/DiagramController.js'
import { ScenarioRunner } from './ScenarioRunner.js'
import { ScenarioStepper } from './ScenarioStepper.js'
import { State } from './state/State.js'
import { resolveAnnotations } from './SystemModel.js'

/**
 * Per-instance diagram orchestration (replaces the former AppMain singleton).
 */
class ScenariaDiagram {
    /**
     * @param {HTMLElement} container
     */
    constructor(container) {
        this._drawingContainer = container
        this._topLevelSVG = null
        this._diagramController = null
        this._model = null
        this._scenarioStepper = null
        this._graph = null
    }

    /**
     * @param {HTMLElement} drawingElement
     */
    _createSVGImpl(drawingElement) {
        return SVG().addTo(drawingElement).addClass('drawingSVG')
    }

    _clearDiagram() {
        if (!this._topLevelSVG) return
        this._topLevelSVG.clear()
        this._drawingContainer.removeChild(this._topLevelSVG.node)
        this._topLevelSVG = null
    }

    layoutOptionsFromInputs(spacing) {
        return newLayoutOptionsFromInputs(spacing)
    }

    /**
     * @param {Object} model
     * @param {Function} moveCB
     * @param {Object} layoutInputs
     */
    presentModel(model, moveCB, layoutInputs) {
        this._model = model
        this._topLevelSVG = this._createSVGImpl(this._drawingContainer)
        // Capture the SVG reference at call time. If reset() is called before the
        // async layout resolves, this._topLevelSVG will point to a newer SVG and
        // this render will be treated as stale — preventing double-draw into the
        // same SVG when _applyCode is triggered concurrently (e.g. spacing + code
        // attributes both changing in the same synchronous block).
        const svgForThisRender = this._topLevelSVG

        return layoutModel(model, layoutInputs)
            .then(g => {
                if (this._topLevelSVG !== svgForThisRender) return null
                this._graph = g
                return drawGraph(svgForThisRender, g, moveCB)
            })
            .then(diagramPainter => {
                if (!diagramPainter) return model
                this._diagramController = new DiagramController(diagramPainter.svgElements, svgForThisRender)
                return model
            })
    }

    /**
     * @param {number} scenarioIndex
     * @param {Function} userMessageCallback
     */
    runScenario(scenarioIndex, userMessageCallback) {
        if (!this._diagramController) {
            throw new Error('Diagram must be initialized before running scenarios')
        }

        if (this._scenarioStepper) {
            this._scenarioStepper.erasePreviousStep()
            this._scenarioStepper = null
        }

        const scenario = this._resolveScenario(scenarioIndex)
        const scenarioRunner = new ScenarioRunner(this._diagramController)
        scenarioRunner.runScenario(scenario, userMessageCallback)
    }

    displayNotes() {
        if (!this._diagramController) {
            throw new Error('Diagram must be initialized before showing notes')
        }
        if (!this._graph.children) {
            throw new Error('Model must be loaded before showing notes')
        }

        const idsToNotes = this._graph.children
            .filter(child => child.note)
            .reduce((notes, child) => {
                notes[child.id] = child.note
                return notes
            }, {})

        this._diagramController.showNotes(idsToNotes)
    }

    hideNotes() {
        if (!this._graph.children) {
            throw new Error('Model must be loaded before hiding notes')
        }

        const elementIdsWithNotes = this._graph.children
            .filter(child => child.note)
            .map(child => child.id)

        this._diagramController.hideNotes(elementIdsWithNotes)
    }

    /**
     * @param {number} scenarioIndex
     */
    getOrCreateScenarioStepper(scenarioIndex) {
        const isNewScenario = !this._scenarioStepper ||
            this._scenarioStepper.scenarioIndex !== scenarioIndex

        if (isNewScenario) {
            if (this._scenarioStepper) {
                this._scenarioStepper.erasePreviousStep()
            }
            console.log(`Creating new scenario stepper for scenario ${scenarioIndex}`)
            this._scenarioStepper = new ScenarioStepper(
                scenarioIndex,
                this._resolveScenario(scenarioIndex),
                this._diagramController
            )
        }
        return this._scenarioStepper
    }

    moveToPreviousStep(scenarioIndex, messageCallback) {
        const stepper = this.getOrCreateScenarioStepper(scenarioIndex)
        stepper.prevStep(messageCallback)
    }

    moveToNextStep(scenarioIndex, messageCallback) {
        const stepper = this.getOrCreateScenarioStepper(scenarioIndex)
        stepper.nextStep(messageCallback)
    }

    scenarioBack(scenarioIndex, messageCallback) {
        this.moveToPreviousStep(scenarioIndex, messageCallback)
    }

    scenarioNext(scenarioIndex, messageCallback) {
        this.moveToNextStep(scenarioIndex, messageCallback)
    }

    /**
     * @param {number} ind
     */
    _resolveScenario(ind) {
        if (!this._model) throw new Error('Model not initialized when running scenario')
        let scenario = this._model.scenarios[ind]
        if (!scenario) throw new Error(`Invalid scenario to run: ${ind}`)
        return scenario
    }

    /**
     * @param {string} programCode
     */
    parseCode(programCode) {
        const parser = createParser()
        return parser(programCode)
    }

    /**
     * Parse program text and resolve annotations. Throws if code is invalid.
     * @param {string} code
     * @returns {Object} resolved model
     */
    tryParseCode(code) {
        const model = this.parseCode(code)
        return resolveAnnotations(model)
    }

    /**
     * @param {string} code
     * @param {() => void} [moveCB]
     * @param {Object} layoutInputs
     */
    parseAndPresent(code, moveCB, layoutInputs) {
        this._model = this.tryParseCode(code)
        console.log(`Parsed code: ${JSON.stringify(this._model)}`)
        return this.presentModel(this._model, moveCB, layoutInputs)
    }

    reset() {
        this._clearDiagram()
        this._scenarioStepper = null
        this._model = null
        this._graph = null
        this._diagramController = null
    }

    /**
     * @param {string} code
     */
    generateStateURLEncoding(code) {
        if (this._graph == null) {
            throw new Error('Invalid graph state when generating state representation')
        }
        return State.encode(this._graph, code)
    }

    /**
     * @param {string} stateParamValue
     * @param {(code: string) => void} codeCB
     * @param {() => void} [moveCB]
     */
    setStateFromURL(stateParamValue, codeCB, moveCB) {
        let state = State.fromBase64(stateParamValue)
        this._model = resolveAnnotations(this.parseCode(state.code))
        codeCB(state.code)
        this._graph = state.graph
        if (!this._topLevelSVG)
            this._topLevelSVG = this._createSVGImpl(this._drawingContainer)
        let painter = drawGraph(this._topLevelSVG, this._graph, moveCB)
        this._diagramController = new DiagramController(painter.svgElements, this._topLevelSVG)
        return this._model
    }
}

export { ScenariaDiagram }
