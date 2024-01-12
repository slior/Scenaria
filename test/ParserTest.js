
const assert = require('assert')
const { createParser } = require('../src/lang/Lang')
const { newActor, ACTOR_TYPE, newChannel, CHANNEL_TYPE} = require('../src/SystemModel')

function createParserForTest()
{
    return createParser();
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
            agent 'AA' as aa;
            //this is just a comment.
            agent 'BB' as bb; //a comment at the end of the line
        `
        let expectedIR = {
            name : "",
            actors : [newActor(ACTOR_TYPE.AGENT,'aa','AA'),newActor(ACTOR_TYPE.AGENT,'bb','BB')],
            channels : [],
            data_flows : [],
            scenarios : [],
            annotations : {},
        }

        parseAndCompare(testProgram,expectedIR)

    })

    it("Parses a literal with punctuation marks", function() {
        let testProgram = String.raw`
            agent 'AA!' as aa;
            agent 'BB (Failure)' as bb; //uses '(' ')'
            agent 'Nanny Ogg-Witch' as now; //uses '-'
        `
        let expectedIR = {
            name : "",
            actors : [  newActor(ACTOR_TYPE.AGENT,'aa','AA!'),
                        newActor(ACTOR_TYPE.AGENT,'bb','BB (Failure)'),
                        newActor(ACTOR_TYPE.AGENT,'now','Nanny Ogg-Witch')
                    ],
            channels : [],
            data_flows : [],
            scenarios : [],
            annotations : {},
        }

        parseAndCompare(testProgram,expectedIR)

    })

    it("Parses channel definitions", function() {
        let testProgram = String.raw`
            agent 'AA!' as aa;
            agent 'BB (Failure)' as bb; //uses '(' ')'
            agent 'Nanny Ogg-Witch' as now; //uses '-'

            aa -('')-> bb;
            bb - ( 'stam' ) -> now;
            bb - ( 'cdc:data moved' ) -\\ aa;
        `
        let expectedIR = {
            name : "",
            actors : [  newActor(ACTOR_TYPE.AGENT,'aa','AA!'),
                        newActor(ACTOR_TYPE.AGENT,'bb','BB (Failure)'),
                        newActor(ACTOR_TYPE.AGENT,'now','Nanny Ogg-Witch')
                    ],
            channels : [    newChannel(CHANNEL_TYPE.REQ_RES,'aa','bb',""),
                            newChannel(CHANNEL_TYPE.REQ_RES,'bb','now',"stam"),
                            newChannel(CHANNEL_TYPE.ASYNC,'bb','aa',"cdc:data moved")
                    ],
            data_flows : [],
            scenarios : [],
            annotations : {},
        }

        parseAndCompare(testProgram,expectedIR)
    })

    it("Rejects identifiers that are reserved words", function() {
        assert.throws(() => {
            let problemSource = String.raw`
                agent 'user' as user;
            `
            createParserForTest()(problemSource)
          },/not a reserved_word/,"trying to parse 'user' as an identifier")
    
          assert.throws(() => {
            let problemSource = String.raw`
              store 'db' as agent;
            `
            createParserForTest()(problemSource)
          },/not a reserved_word/,"trying to parse 'agent' as an identifier")
    
    })

    it("Parses a note for an identifier", function() {
        let testProgram = String.raw`
            agent 'Vizzini' as vi;
            store 'Hoard!' as h;

            note for vi: 'Inconceivable!';
            note for h : 'all the gold is here';
        `
        let expectedIR = {
            name : "",
            actors : [  newActor(ACTOR_TYPE.AGENT,'vi','Vizzini',"Inconceivable!"),
                        newActor(ACTOR_TYPE.STORE,'h','Hoard!',"all the gold is here")
                    ],
            channels : [ ],
            data_flows : [],
            scenarios : [],
            annotations : {},
        }

        parseAndCompare(testProgram,expectedIR)
    })

    it("Rejects a note for an identifier it doesn't know", function() {
        assert.throws(() => {
            let problemSource = String.raw`
              agent 'user' as u;
              note for unknown : 'some note';
            `
            createParserForTest()(problemSource)
          },/Unrecognized id for note/,"unrecognized actor id for note")
    })

    it("Parsers a user and agent actors successfully",function() {
        let testProgram = String.raw`
            agent 'Vizzini' as vi;
            user 'Inigo' as montoya;

            note for vi: 'Inconceivable!';
            note for montoya : 'Hello! My name is Inigo Montoya ...';
        `
        let expectedIR = {
            name : "",
            actors : [  newActor(ACTOR_TYPE.AGENT,'vi','Vizzini',"Inconceivable!"),
                        newActor(ACTOR_TYPE.USER,'montoya','Inigo',"Hello! My name is Inigo Montoya ...")
                    ],
            channels : [ ],
            data_flows : [],
            scenarios : [],
            annotations : {},
        }

        parseAndCompare(testProgram,expectedIR)
    })

    it("Parses an annotation assignment correctly", function() {
        let testProgram = String.raw`
            agent 'Vizzini' as vi;
            user 'Inigo' as montoya;

            note for vi: 'Inconceivable!';
            note for montoya : 'Hello! My name is Inigo Montoya ...';

            vi is @BadGuy;
            montoya is @GoodGuy;
        `
        let expectedIR = {
            name : "",
            actors : [  newActor(ACTOR_TYPE.AGENT,'vi','Vizzini',"Inconceivable!", ['BadGuy']),
                        newActor(ACTOR_TYPE.USER,'montoya','Inigo',"Hello! My name is Inigo Montoya ...", ['GoodGuy'])
                    ],
            channels : [ ],
            data_flows : [],
            scenarios : [],
            annotations : {},
        }

        parseAndCompare(testProgram,expectedIR)
    })

    it("Parses an annotation definition correctly", function() {
  
        let testProgram = String.raw`
            agent 'Vizzini' as vi;
            user 'Inigo' as montoya;

            vi is @BadGuy;
            montoya is @GoodGuy;

            @BadGuy {
                color : 'blue';
            };

            @GoodGuy {
                prototype : 'good';
            };
        `
        let expectedIR = {
            name : "",
            actors : [  newActor(ACTOR_TYPE.AGENT,'vi','Vizzini',"", ['BadGuy']),
                        newActor(ACTOR_TYPE.USER,'montoya','Inigo',"", ['GoodGuy'])
                    ],
            channels : [ ],
            data_flows : [],
            scenarios : [],
            annotations : {
                "BadGuy" : { color : 'blue'},
                "GoodGuy" : { prototype : 'good'}
            },
        }

        parseAndCompare(testProgram,expectedIR)
    })

    it ("Parses an annotation clause on an actor definition correctly", function() {
        let testProgram = String.raw`
            agent 'Vizzini' as vi is @BadGuy;
            user 'Inigo' as montoya is @GoodGuy;
            store 'Pit of Despair' as pod;

            pod is @BadGuy;

            @BadGuy {
                color : 'red';
            };

            @GoodGuy {
                prototype : 'good';
            };
        `
        let expectedIR = {
            name : "",
            actors : [  newActor(ACTOR_TYPE.AGENT,'vi','Vizzini',"", ['BadGuy']),
                        newActor(ACTOR_TYPE.USER,'montoya','Inigo',"", ['GoodGuy']),
                        newActor(ACTOR_TYPE.STORE,'pod','Pit of Despair',"", ['BadGuy']),
                    ],
            channels : [ ],
            data_flows : [],
            scenarios : [],
            annotations : {
                "BadGuy" : { color : 'red'},
                "GoodGuy" : { prototype : 'good'}
            },
        }

        parseAndCompare(testProgram,expectedIR)
    })
})