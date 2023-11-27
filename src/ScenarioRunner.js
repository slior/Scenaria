
const { ScenarioExecuter } = require('./ScenarioExecuter')

const RESET_STEP_RENDER_TIME = 800
const NEXT_STEP_TIME = RESET_STEP_RENDER_TIME + 700

class ScenarioRunner extends ScenarioExecuter
{
    constructor(diagramController)
    {
        super(diagramController)

    }

    runScenario(scenario,userMsgCallback,fromIndex = 0)
    {
        if (!scenario) throw new Error("Invalid scenario")

        userMsgCallback(`Running scenario ${scenario.name}`)
        
        let allSteps = scenario.steps
        let step = allSteps[fromIndex]
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