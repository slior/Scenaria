const CHANNEL_REQUEST_COLOR = '#8B008B'
const CHANNEL_RESPONSE_COLOR = '#A9A9A9'

/**
 * Base class for scenario execution and display
 */
class ScenarioExecuter
{
    constructor(diagramController)
    {
        if (!diagramController) throw new Error("Invalid diagram controller for scenario runner")
        this._diagramController = diagramController
        this._lastStepIndex = -1;
    }

    get lastStepIndex() { return this._lastStepIndex }

    _runStep(allSteps,index,userMsgCallback)
    {
        let step = allSteps[index]
        if (!step) throw new Error(`Couldn't find step ${index}`)

        userMsgCallback(`${step.message || "--"}`)
        this._renderStep(step)
        this._lastStepIndex = index;
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
    ScenarioExecuter
}