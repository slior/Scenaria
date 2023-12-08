const CHANNEL_REQUEST_COLOR = '#8B008B'
const CHANNEL_RESPONSE_COLOR = '#A9A9A9'
const DATA_FLOW_COLOR = CHANNEL_REQUEST_COLOR

const { SCENARIO_STEP_TYPE }  = require('./SystemModel')
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

    /**
     * The index of the last step that run by this executer.
     */
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
        switch (step.type)
        {
            case SCENARIO_STEP_TYPE.REQ:
            case SCENARIO_STEP_TYPE.RES:
                this._diagramController.deHighlight(step.channel)
                this._diagramController.removeMessageFromChannel(step.channel)
                break;
            case SCENARIO_STEP_TYPE.DATA_READ:
            case SCENARIO_STEP_TYPE.DATA_WRITE:
                this._diagramController.deHighlight(step.dataflow)
                this._diagramController.removeMessageFromDataFlow(step.dataflow)
                break;
        }
    }

    _renderChannelStep(step)
    {
        let color = step.type == SCENARIO_STEP_TYPE.REQ ? CHANNEL_REQUEST_COLOR : CHANNEL_RESPONSE_COLOR
        this._diagramController.highlight(step.channel,color)
        if (step.message)
            this._diagramController.showMessageOnChannel(step.channel,step.message)
    }

    _renderStep(step)
    {
        switch (step.type) {
            case SCENARIO_STEP_TYPE.REQ:
            case SCENARIO_STEP_TYPE.RES:
                this._renderChannelStep(step)
                break
            case SCENARIO_STEP_TYPE.DATA_READ : 
            case SCENARIO_STEP_TYPE.DATA_WRITE : 
                this._diagramController.highlight(step.dataflow,DATA_FLOW_COLOR)
                if (step.message)
                    this._diagramController.showMessageOnDataFlow(step.dataflow,step.message)
                break;
        }
    }
}

module.exports = {
    ScenarioExecuter
}