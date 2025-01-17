
const { createParser, getLanguageKeywords } = require("./lang/Lang")

const assert = require('assert')
const { SVG } = require('@svgdotjs/svg.js')
const {layoutModel,drawGraph, newLayoutOptionsFromInputs } = require('./diagram/DiagDraw')
const { DiagramController } = require('./diagram/DiagramController')
const { ScenarioRunner } = require('./ScenarioRunner')
const { ScenarioStepper } = require('./ScenarioStepper') 
const { State } = require('./state/State')
const { resolveAnnotations } = require('./SystemModel')

var drawingContainer = null;
var topLevelSVG = null;
var diagramController = null;
var model = null;
var scenarioStepper = null;
var graph = null;

function initApp(_drawingContainer)
{
    drawingContainer = _drawingContainer
    return {};
}


const createSVGImpl = (drawingElement) => 
    SVG().addTo(drawingElement).addClass("drawingSVG")



function clearDiagram()
{
    if (topLevelSVG) //if this wasn't initialized - nothing to clear.
    {
        topLevelSVG.clear()
        drawingContainer.removeChild(topLevelSVG.node)
        topLevelSVG = null;
    }
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

function presentModel(model,moveCB, layoutInputs)
{
     topLevelSVG = createSVGImpl(drawingContainer)

    return layoutModel(model, layoutInputs)
            .then(g => { 
                graph = g;
                return drawGraph(topLevelSVG,g,moveCB)
            })
            .then(diagramPainter => {
                diagramController = new DiagramController(diagramPainter.svgElements,topLevelSVG)
                return model
            })
}

function runScenario(scenarioInd, usrMsgCallback)
{
    if (!diagramController) throw new Error("Diagram not initialized/drawn")

    if (scenarioStepper != null) 
    { //in case we ran a stepper before this, erase the last step and forget it.
        scenarioStepper.erasePreviousStep();
        scenarioStepper = null;
    }
    let scenario = resolveScenario(scenarioInd)
    let scenarioRunner = new ScenarioRunner(diagramController)
    scenarioRunner.runScenario(scenario,usrMsgCallback)
}

function showNotes()
{
    if (!diagramController) throw new Error("Diagram not initialized/drawn")
    if (!graph.children) throw new Error("No model loaded")
    //extract all elements with notes, with their corresponding IDs
    let idsToNotes = graph.children.filter(child => child.note)
                  .reduce((result,child) => {
                    result[child.id] = child.note
                    return result
                  }, {} )
    //show the notes on the diagram
    diagramController.showNotes(idsToNotes)
}

function hideNotes()
{
    if (!graph.children) throw new Error("No model loaded")
    let elementsWithNotes = graph.children.filter(child => child.note)
                                            .map(child => child.id)
    diagramController.hideNotes(elementsWithNotes)
}

function getScenarioStepper(scenarioInd)
{
    
    if (scenarioStepper == null || scenarioStepper.scenarioIndex != scenarioInd)
    {
        if (scenarioStepper != null) scenarioStepper.erasePreviousStep();
        console.log(`New scenario stepper for scenario ${scenarioInd}`)
        scenarioStepper = new ScenarioStepper(scenarioInd,resolveScenario(scenarioInd),diagramController)
    }
    return scenarioStepper
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
    if (!model) throw new Error("Model not initialized when running scenarion")
    let scenario = model.scenarios[ind]
    if (!scenario) throw new Error(`Invalid scenario to run: ${scenarioInd}`)
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
    model = parseCode(code)
    console.log(`Parsed code: ${JSON.stringify(model)}`)
    model = resolveAnnotations(model)
    return presentModel(model,moveCB, layoutInputs)
}

/**
 * Reset the existing application state.
 * Also clear the diagram from the initialized drawing container.
 */
function reset()
{
    clearDiagram()
    scenarioRunner = null;
    model = null;
    graph = null;
}

function generateStateURLEncoding(code)
{
    assert(graph != null, "Invalid graph state when generating state representation")

    return State.encode(graph,code)

}

function setStateFromURL(stateParamValue,codeCB,moveCB)
{
    let state = State.fromBase64(stateParamValue)
    model = resolveAnnotations(parseCode(state.code))
    codeCB(state.code)
    graph = state.graph
    if (!topLevelSVG)
        topLevelSVG = createSVGImpl(drawingContainer)
    let painter = drawGraph(topLevelSVG,graph,moveCB)
    diagramController = new DiagramController(painter.svgElements,topLevelSVG)
    return model
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
