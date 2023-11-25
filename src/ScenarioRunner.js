
const CHANNEL_REQUEST_COLOR = '#8B008B'
const CHANNEL_RESPONSE_COLOR = '#A9A9A9'

const RESET_STEP_RENDER_TIME = 800
const NEXT_STEP_TIME = RESET_STEP_RENDER_TIME + 700

class ScenarioRunner
{
    constructor(diagramController)
    {
        if (!diagramController) throw new Error("Invalid diagram controller for scenario runner")
        this._diagramController = diagramController
    }

    runScenario(scenario,userMsgCallback)
    {
        if (!scenario) throw new Error("Invalid scenario")

        userMsgCallback(`Running scenario ${scenario.name}`)
        
        this._runStep(scenario.steps,0,userMsgCallback)
    }

    _runStep(allSteps,index,userMsgCallback)
    {
        let step = allSteps[index]
        userMsgCallback(`${step.message || "--"}`)
        this._renderStep(step)
    
        setTimeout(() => {
            this._unRenderStep(step)
        },RESET_STEP_RENDER_TIME)
    
        if (index < allSteps.length-1)
            setTimeout(() => {
                this._runStep(allSteps,index+1,userMsgCallback)
            },NEXT_STEP_TIME)
    
    }


    _unRenderStep(step) 
    {
        this._diagramController.deHighlight(step.channel)
        this._diagramController.removeMessageFromChannel(step.channel)
    }

    _renderStep(step)
    {
        switch (step.type) {
            case "req":
                this._diagramController.highlight(step.channel, CHANNEL_REQUEST_COLOR)
                break
            case 'res':
                this._diagramController.highlight(step.channel, CHANNEL_RESPONSE_COLOR)
                break
        }
        if (step.message)
            this._diagramController.showMessageOnChannel(step.channel, step.message)
    }
}

module.exports = {
    ScenarioRunner
}