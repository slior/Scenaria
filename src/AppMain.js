
// const { VMState } = require("./VMState.js")
// const { createParser,getLanguageKeywords } = require("./Lang")
// const { ProgramRunner } = require("./ProgramRunner")
// const {assertIsNum } = require("./util")

const assert = require('assert')
const { SVG } = require('@svgdotjs/svg.js')
const {layoutModel,drawGraph } = require('./DiagDraw')
const { DiagramController, CHANNEL_REQ_COLOR, CHANNEL_RESPONSE_COLOR } = require('./DiagramController')


var programRunner = null;
var drawingContainer = null;

function initApp(_drawingContainer)
{
    drawingContainer = _drawingContainer
    return {};
}


const createSVGImpl = (drawingElement) => 
    SVG().addTo(drawingElement).addClass("drawingSVG")



function presentModel(model)
{
    let draw = createSVGImpl(drawingContainer)

    return layoutModel(model)
            .then(g => drawGraph(draw,g))
            .then(svgElements =>{
                let diagramController = new DiagramController(svgElements)
                return diagramController
            })
}

function runScenario(diagramController,scenario,userMsgCallback)
{
    if (!diagramController) throw new Error("Diagram not drawn")
    if (!scenario) throw new Error("Invalid scenario")

    userMsgCallback(`Running scenario ${scenario.name}`)
    
    runStep(scenario.steps,0,diagramController,userMsgCallback)
}

function runStep(allSteps,index,diagramController,userMsgCallback)
{
    userMsgCallback(`Running step: ${JSON.stringify(allSteps[index])}`)
    let step = allSteps[index]
    switch(step.type)
    {
        case "req" : 
            diagramController.highlight(step.channel, CHANNEL_REQ_COLOR)
            break;
        case 'res' : 
            diagramController.highlight(step.channel, CHANNEL_RESPONSE_COLOR)
            break;
    }

    setTimeout(() => {
        diagramController.deHighlight(step.channel)
    },800)

    if (index < allSteps.length-1)
        setTimeout(() => {
            runStep(allSteps,index+1,diagramController,userMsgCallback)
        },1500)

}

function parseCode(programCode)
{
    // let parser = createParser(variant)
    // let program = parser(programCode);
    // return program;
    return JSON.parse(programCode); //for now, no code to parse - we get JSON code and return it.
}

module.exports = {
    initApp,
    parseCode,
    // resetState,
    // getLanguageKeywords,
    presentModel,
    runScenario
}
