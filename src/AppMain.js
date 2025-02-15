const { createParser, getLanguageKeywords } = require("./lang/Lang")

const assert = require('assert')
const { SVG } = require('@svgdotjs/svg.js')
const {layoutModel,drawGraph, newLayoutOptionsFromInputs } = require('./diagram/DiagDraw')
const { DiagramController } = require('./diagram/DiagramController')
const { ScenarioRunner } = require('./ScenarioRunner')
const { ScenarioStepper } = require('./ScenarioStepper') 
const { State } = require('./state/State')
const { resolveAnnotations } = require('./SystemModel')

/**
 * Application state containing all diagram-related objects
 * @type {{
 *   drawingContainer: HTMLElement|null,
 *   topLevelSVG: Object|null,
 *   diagramController: DiagramController|null,
 *   model: Object|null,
 *   scenarioStepper: ScenarioStepper|null,
 *   graph: Object|null
 * }}
 */
const appState = {
    drawingContainer: null,
    topLevelSVG: null,
    diagramController: null,
    model: null,
    scenarioStepper: null,
    graph: null
};

/**
 * Initializes the application with a drawing container
 * @param {HTMLElement} container The container element for drawing
 * @returns {Object} Empty object for backwards compatibility
 */
function initApp(container) {
    appState.drawingContainer = container;
    return {};
}

/**
 * Creates and configures an SVG element in the drawing container
 * @param {HTMLElement} drawingElement Container element for the SVG
 * @returns {Object} Configured SVG element
 */
const createSVGImpl = (drawingElement) => 
    SVG().addTo(drawingElement).addClass("drawingSVG");

/**
 * Clears the current diagram and removes SVG element
 */
function clearDiagram() {
    if (!appState.topLevelSVG) return;
    
    appState.topLevelSVG.clear();
    appState.drawingContainer.removeChild(appState.topLevelSVG.node);
    appState.topLevelSVG = null;
}

/**
 * Creates layout options based on the provided user inputs.
 * 
 * @param {number} spacing The spacing value to use for layout.
 * @returns {Object} An object containing the layout options.
 * @throws {Error} If any value given is invalid
 */
function layoutOptionsFromInputs(spacing)
{
    return newLayoutOptionsFromInputs(spacing)
}

/**
 * Presents the model by creating and configuring the diagram
 * @param {Object} model The model to present
 * @param {Function} moveCB Callback function for move events
 * @param {Object} layoutInputs Layout configuration options
 * @returns {Promise<Object>} Promise resolving to the model
 */
function presentModel(model, moveCB, layoutInputs) {
    appState.topLevelSVG = createSVGImpl(appState.drawingContainer);

    return layoutModel(model, layoutInputs)
        .then(g => {
            appState.graph = g;
            return drawGraph(appState.topLevelSVG, g, moveCB);
        })
        .then(diagramPainter => {
            appState.diagramController = new DiagramController(diagramPainter.svgElements, appState.topLevelSVG);
            return model;
        });
}

/**
 * Runs a scenario with the given index
 * @param {number} scenarioIndex Index of the scenario to run
 * @param {Function} userMessageCallback Callback for user messages
 * @throws {Error} If diagram is not initialized or scenario is invalid
 */
function runScenario(scenarioIndex, userMessageCallback) {
    if (!appState.diagramController) {
        throw new Error("Diagram must be initialized before running scenarios");
    }

    if (appState.scenarioStepper) {
        appState.scenarioStepper.erasePreviousStep();
        appState.scenarioStepper = null;
    }

    const scenario = resolveScenario(scenarioIndex);
    const scenarioRunner = new ScenarioRunner(appState.diagramController);
    scenarioRunner.runScenario(scenario, userMessageCallback);
}

function showNotes()
{
    if (!appState.diagramController) throw new Error("Diagram not initialized/drawn")
    if (!appState.graph.children) throw new Error("No model loaded")
    //extract all elements with notes, with their corresponding IDs
    let idsToNotes = appState.graph.children.filter(child => child.note)
                  .reduce((result,child) => {
                    result[child.id] = child.note
                    return result
                  }, {} )
    //show the notes on the diagram
    appState.diagramController.showNotes(idsToNotes)
}

function hideNotes()
{
    if (!appState.graph.children) throw new Error("No model loaded")
    let elementsWithNotes = appState.graph.children.filter(child => child.note)
                                            .map(child => child.id)
    appState.diagramController.hideNotes(elementsWithNotes)
}

function getScenarioStepper(scenarioInd)
{
    
    if (appState.scenarioStepper == null || appState.scenarioStepper.scenarioIndex != scenarioInd)
    {
        if (appState.scenarioStepper != null) appState.scenarioStepper.erasePreviousStep();
        console.log(`New scenario stepper for scenario ${scenarioInd}`)
        appState.scenarioStepper = new ScenarioStepper(scenarioInd,resolveScenario(scenarioInd),appState.diagramController)
    }
    return appState.scenarioStepper
}

function scenarioBack(scenarioInd,usrMsgCallback)
{
    let stepper = getScenarioStepper(scenarioInd)
    stepper.prevStep(usrMsgCallback)
}

function scenarioNext(scenarioInd,usrMsgCallback)
{
    let stepper = getScenarioStepper(scenarioInd)
    stepper.nextStep(usrMsgCallback)
}

function resolveScenario(ind)
{
    if (!appState.model) throw new Error("Model not initialized when running scenario")
    let scenario = appState.model.scenarios[ind]
    if (!scenario) throw new Error(`Invalid scenario to run: ${ind}`)
    return scenario;
}

function parseCode(programCode)
{
    let parser = createParser()
    let program = parser(programCode);
    return program;
}

/**
 * Given code representing the model and scenarios, parse it and present it on the initialized diagram container.
 * @param {String} code The code for the model
 * @param {() => void} moveCB An optional callback to call when a node is moved
 * @returns A promise with the parsed model.
 */
function parseAndPresent(code,moveCB, layoutInputs)
{
    appState.model = parseCode(code)
    console.log(`Parsed code: ${JSON.stringify(appState.model)}`)
    appState.model = resolveAnnotations(appState.model)
    return presentModel(appState.model,moveCB, layoutInputs)
}

/**
 * Resets the application state and clears the diagram
 */
function reset()
{
    clearDiagram()
    appState.scenarioStepper = null;
    appState.model = null;
    appState.graph = null;
}

function generateStateURLEncoding(code)
{
    assert(appState.graph != null, "Invalid graph state when generating state representation")

    return State.encode(appState.graph,code)

}

function setStateFromURL(stateParamValue,codeCB,moveCB)
{
    let state = State.fromBase64(stateParamValue)
    appState.model = resolveAnnotations(parseCode(state.code))
    codeCB(state.code)
    appState.graph = state.graph
    if (!appState.topLevelSVG)
        appState.topLevelSVG = createSVGImpl(appState.drawingContainer)
    let painter = drawGraph(appState.topLevelSVG,appState.graph,moveCB)
    appState.diagramController = new DiagramController(painter.svgElements,appState.topLevelSVG)
    return appState.model
}

module.exports = {
    initApp,
    runScenario,
    parseAndPresent,
    reset,
    scenarioBack,
    scenarioNext,
    generateStateURLEncoding,
    setStateFromURL,
    getLanguageKeywords,
    showNotes,
    hideNotes,
    layoutOptionsFromInputs
}
