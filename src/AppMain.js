
// const { VMState } = require("./VMState.js")
// const { createParser,getLanguageKeywords } = require("./Lang")
// const { ProgramRunner } = require("./ProgramRunner")
// const {assertIsNum } = require("./util")

const assert = require('assert')
const { SVG } = require('@svgdotjs/svg.js')
const {layoutModel,drawGraph } = require('./DiagDraw')
const { DiagramController } = require('./DiagramController')
const { ScenarioRunner } = require('./ScenarioRunner')
const { ScenarioStepper } = require('./ScenarioStepper') 

var drawingContainer = null;
var topLevelSVG = null;
var diagramController = null;
var model = null;

function initApp(_drawingContainer)
{
    drawingContainer = _drawingContainer
    return {};
}


const createSVGImpl = (drawingElement) => 
    SVG().addTo(drawingElement).addClass("drawingSVG")



function clearDiagram()
{
    topLevelSVG.clear()
    drawingContainer.removeChild(topLevelSVG.node)
}

function presentModel(model)
{
     topLevelSVG = createSVGImpl(drawingContainer)

    return layoutModel(model)
            .then(g => drawGraph(topLevelSVG,g))
            .then(svgElements => {
                diagramController = new DiagramController(svgElements,topLevelSVG)
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

var scenarioStepper = null;

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
    // let parser = createParser(variant)
    // let program = parser(programCode);
    // return program;
    return JSON.parse(programCode); //for now, no code to parse - we get JSON code and return it.
}

/**
 * Given code representing the model and scenarios, parse it and present it on the initialized diagram container.
 * @param {String} code The code for the model
 * @returns A promise with the parsed model.
 */
function parseAndPresent(code)
{
    model = parseCode(code)
    return presentModel(model)
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
}

module.exports = {
    initApp,
    runScenario,
    parseAndPresent,
    reset,
    scenarioBack,
    scenarioNext
}
