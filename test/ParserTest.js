
const assert = require('assert')
const { createParser } = require('../src/lang/Lang')
const { newActor, ACTOR_TYPE, newChannel, CHANNEL_TYPE} = require('../src/SystemModel')

function createParserForTest()
{
  if (!createParserForTest.cached)
    createParserForTest.cached = createParser() //tests are for the default variant
  return createParserForTest.cached
}

function parseAndCompare(testSource,expectedIR) 
{
  let p = createParserForTest()
  let result = p(testSource)
  assert.deepStrictEqual(result,expectedIR)
}


describe("Scenaria Language Parser", function() {
    it("Successfully parses a comment and ignores it", function() {
        let testProgram = String.raw`
            actor 'AA' as aa;
            //this is just a comment.
            actor 'BB' as bb; //a comment at the end of the line
        `
        let expectedIR = {
            name : "",
            actors : [newActor(ACTOR_TYPE.AGENT,'aa','AA'),newActor(ACTOR_TYPE.AGENT,'bb','BB')],
            channels : [],
            data_flows : [],
            scenarios : []
        }

        parseAndCompare(testProgram,expectedIR)

    })

    it("Parses a literal with punctuation marks", function() {
        let testProgram = String.raw`
            actor 'AA!' as aa;
            actor 'BB (Failure)' as bb; //uses '(' ')'
            actor 'Nanny Ogg-Witch' as now; //uses '-'
        `
        let expectedIR = {
            name : "",
            actors : [  newActor(ACTOR_TYPE.AGENT,'aa','AA!'),
                        newActor(ACTOR_TYPE.AGENT,'bb','BB (Failure)'),
                        newActor(ACTOR_TYPE.AGENT,'now','Nanny Ogg-Witch')
                    ],
            channels : [],
            data_flows : [],
            scenarios : []
        }

        parseAndCompare(testProgram,expectedIR)

    })

    it("Parses channel definitions", function() {
        let testProgram = String.raw`
            actor 'AA!' as aa;
            actor 'BB (Failure)' as bb; //uses '(' ')'
            actor 'Nanny Ogg-Witch' as now; //uses '-'

            aa -('')-> bb;
            bb - ( 'stam' ) -> now;
        `
        let expectedIR = {
            name : "",
            actors : [  newActor(ACTOR_TYPE.AGENT,'aa','AA!'),
                        newActor(ACTOR_TYPE.AGENT,'bb','BB (Failure)'),
                        newActor(ACTOR_TYPE.AGENT,'now','Nanny Ogg-Witch')
                    ],
            channels : [    newChannel(CHANNEL_TYPE.REQ_RES,'aa','bb',""),
                            newChannel(CHANNEL_TYPE.REQ_RES,'bb','now',"stam")
                    ],
            data_flows : [],
            scenarios : []
        }

        parseAndCompare(testProgram,expectedIR)
    })
})