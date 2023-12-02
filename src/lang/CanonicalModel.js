
const {Actor,Store, DataFlowWrite, DataFlowRead} = require("./IR")
const {ACTOR_TYPE} = require("../SystemModel")

/**
 * Converts the given program to a canonical representation that can be consumed by the presentation code.
 * @param {Program} program A program object
 * @returns The object representing the canonical model
 */
function toCanonicalModel(program)
{
    if (!program) throw new Error ("Invalid program when converting to canonical model")

    let actors = program.statements.filter(s => s instanceof Actor)
                                    .map(a => { return {
                                        type : ACTOR_TYPE.AGENT,
                                        caption : a.caption,
                                        id : a.id
                                    }})
                
                .concat( program.statements.filter(st => st instanceof Store)
                                            .map(s => { return {
                                                type : ACTOR_TYPE.STORE,
                                                caption : s.caption,
                                                id : s.id
                                            }})
                )
    
    let dataFlows = program.statements.filter(s => s instanceof DataFlowWrite)
                                      .map(dfw => { return {
                                          type : "write",
                                          from : dfw.agent.id,
                                          to : dfw.store.id
                                       }})
                    .concat(program.statements.filter(s => s instanceof DataFlowRead)
                                                .map(dfr => { return {
                                                    type : "read",
                                                    from: dfr.store.id,
                                                    to : dfr.agent.id
                                                }})
                    )
    
    return {
        "name" : "",
        actors : actors,
        channels : [],
        data_flows : dataFlows,
        scenarios : []
    }

}


module.exports = {
    toCanonicalModel
}