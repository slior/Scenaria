const { ScenarioExecuter } = require('./ScenarioExecuter')


class ScenarioStepper extends ScenarioExecuter
{
    constructor(scenarioInd, scenario, diagramController)
    {
        super(diagramController)

        if (!scenario) throw new Error("Invalid scenario when initializing a scenario stepper")
        if (!scenarioInd || scenarioInd < 0) throw new Error(`Invalid scenario index: ${scenarioInd}`)
        this._scenarioInd = scenarioInd
        this._scenario = scenario;
    }


    get scenarioIndex() { return this._scenarioInd; }

    nextStep(userMsgCallback)
    {
        let stepToRun = this.lastStepIndex >= this._scenario.steps.length-1 ? 
                            this._scenario.steps.length-1 : 
                            this.lastStepIndex+1
        this._run(stepToRun,userMsgCallback)
    }

    prevStep(userMsgCallback)
    {
        let stepToRun = this.lastStepIndex == 0 ? 
                            0 : 
                            this.lastStepIndex - 1;
        this._run(stepToRun,userMsgCallback)
    }

    _run(stepIndex,userMsgCallback)
    {
        this.erasePreviousStep()
        this._runStep(this._scenario.steps,stepIndex,userMsgCallback)
    }

    erasePreviousStep()
    {
        let step = this._scenario.steps[this.lastStepIndex]
        if (step)
            this._unRenderStep(step)
    }
}

module.exports = {
    ScenarioStepper
}