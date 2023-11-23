
// const { VMState } = require("./VMState.js")
// const { createParser,getLanguageKeywords } = require("./Lang")
// const { ProgramRunner } = require("./ProgramRunner")
// const {assertIsNum } = require("./util")

const assert = require('assert')
const { SVG } = require('@svgdotjs/svg.js')
const {layoutModel,drawGraph } = require('./DiagDraw')
const { DiagramController } = require('./DiagramController')
const { ScenarioRunner } = require('./ScenarioRunner')

var drawingContainer = null;

function initApp(_drawingContainer)
{
    drawingContainer = _drawingContainer
    return {};
}


const createSVGImpl = (drawingElement) => 
    SVG().addTo(drawingElement).addClass("drawingSVG")

var draw = null

function clearDiagram()
{
    draw.clear()
    drawingContainer.removeChild(draw.node)
}

function presentModel(model)
{
     draw = createSVGImpl(drawingContainer)

    return layoutModel(model)
            .then(g => drawGraph(draw,g))
            .then(svgElements =>{
                return new ScenarioRunner(new DiagramController(svgElements,draw))
            })
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
    clearDiagram
}
