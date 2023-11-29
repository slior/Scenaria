
const { ScenarioExecuter } = require('./ScenarioExecuter')

const RESET_STEP_RENDER_TIME = 800
const NEXT_STEP_TIME = RESET_STEP_RENDER_TIME + 700

/**
 * A scenario executer that runs a scenario without stopping.
 */
class ScenarioRunner extends ScenarioExecuter
{
    constructor(diagramController)
    {
        super(diagramController)

    }

    /**
     * Run the given scenario, from the given step
     * 
     * @param {Scenario} scenario The scenario object, as defined in the model
     * @param {String => void} userMsgCallback A function to call with messages to the user
     * @param {Integer} fromIndex The index of the step to start running the scenario from. Defaults to 0. Used for recursive calls. 
     */
    runScenario(scenario,userMsgCallback,fromIndex = 0)
    {
        if (!scenario) throw new Error("Invalid scenario")

        userMsgCallback(`Running scenario ${scenario.name}`)
        
        let allSteps = scenario.steps
        let step = allSteps[fromIndex]
        if (!step) throw new Error(`Invalid step index when running scenario: ${fromIndex}`)
        this._runStep(allSteps,fromIndex,userMsgCallback)

        setTimeout(() => {
            this._unRenderStep(step)
        },RESET_STEP_RENDER_TIME)
    
        if (fromIndex < allSteps.length-1)
            setTimeout(() => {
                this.runScenario(scenario,userMsgCallback,fromIndex+1)
            },NEXT_STEP_TIME)
    }
}

module.exports = {
    ScenarioRunner
}