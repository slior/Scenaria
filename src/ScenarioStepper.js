const { ScenarioExecuter } = require('./ScenarioExecuter')

/**
 * A scenario executer that runs one step at a time.
 * It is initialized with a given scenario (and its id - its index), and maintains state
 * 
 * A scenario stepper for a different scenario needs to be a new instance of this class.
 */
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

    /**
     * Execute the next step, if available.
     * If we're at the end of the scenario, runs the last step.
     * 
     * @param {String => void} userMsgCallback The callback for displaying messages to user
     */
    nextStep(userMsgCallback)
    {
        let stepToRun = this.lastStepIndex >= this._scenario.steps.length-1 ? 
                            this._scenario.steps.length-1 : 
                            this.lastStepIndex+1
        this._run(stepToRun,userMsgCallback)
    }

    /**
     * Execute the previous step.
     * If we're at the beginning of the scenario, executes the first step
     * @param {String => void} userMsgCallback The callback for displaying messages to the user
     */
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