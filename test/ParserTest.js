
const assert = require('assert')
const { createParser } = require('../src/lang/Lang')
const { newActor, ACTOR_TYPE, newChannel, CHANNEL_TYPE, newStep, SCENARIO_STEP_TYPE, newContainer, newAnnotationDefElement, channelID, newDataFlow, DATA_FLOW_TYPE, newAnnotation, ANNOTATION_KEY} = require('../src/SystemModel');
const { create } = require('domain');

function createParserForTest()
{
    return createParser();
}

function    parseAndCompare(testSource,expectedIR) 
{
  let p = createParserForTest()
  let result = p(testSource)
  assert.deepStrictEqual(result,expectedIR)
}

function createExpectedIR(overriddenProps)
{
    let baseIR = {
        name : "",
        actors : [],
        channels : [],
        data_flows : [],
        scenarios : [],
        annotations : {},
        containers : {},
    }

    let ret = Object.assign(baseIR,overriddenProps)
    return ret;
}

describe("Scenaria Language Parser", function() {
    it("Successfully parses a comment and ignores it", function() {
        let testProgram = String.raw`
            agent 'AA' as aa;
            //this is just a comment.
            agent 'BB' as bb; //a comment at the end of the line

            'some scenario' {
                aa -('')-> bb //aa to bb: nothing
                //and this is another comment
                
            };
        `

        let aa = newActor(ACTOR_TYPE.AGENT,'aa','AA')
        let bb = newActor(ACTOR_TYPE.AGENT,'bb','BB')
        let aabb = newChannel(CHANNEL_TYPE.REQ_RES,aa.id,bb.id,"")
        let scenario = { name: "some scenario", steps : [
            newStep(aabb,SCENARIO_STEP_TYPE.REQ,"")
        ]}

        let expectedIR = createExpectedIR({
            actors : [aa,bb], 
            scenarios : [scenario], 
            channels : [aabb]
        })

        parseAndCompare(testProgram,expectedIR)

    })

    it("Parses a literal with punctuation marks", function() {
        let testProgram = String.raw`
            agent 'AA!' as aa;
            agent 'BB (Failure)' as bb; //uses '(' ')'
            agent 'Nanny Ogg-Witch' as now; //uses '-'
        `
        let expectedIR = createExpectedIR({
            actors : [  newActor(ACTOR_TYPE.AGENT,'aa','AA!'),
                        newActor(ACTOR_TYPE.AGENT,'bb','BB (Failure)'),
                        newActor(ACTOR_TYPE.AGENT,'now','Nanny Ogg-Witch')
            ],
        })

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

        let expectedIR = createExpectedIR({
            actors : [
                newActor(ACTOR_TYPE.AGENT,'aa','AA!'),
                newActor(ACTOR_TYPE.AGENT,'bb','BB (Failure)'),
                newActor(ACTOR_TYPE.AGENT,'now','Nanny Ogg-Witch')
            ],
            channels : [
                newChannel(CHANNEL_TYPE.REQ_RES,'aa','bb',""),
                newChannel(CHANNEL_TYPE.REQ_RES,'bb','now',"stam"),
                newChannel(CHANNEL_TYPE.ASYNC,'bb','aa',"cdc:data moved")
            ],

        })
       
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

        let expectedIR = createExpectedIR({ 
                actors : [
                    newActor(ACTOR_TYPE.AGENT,'vi','Vizzini',"Inconceivable!"),
                    newActor(ACTOR_TYPE.STORE,'h','Hoard!',"all the gold is here")
                ],
        })

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

        let expectedIR = createExpectedIR({
            actors : [  
                newActor(ACTOR_TYPE.AGENT,'vi','Vizzini',"Inconceivable!"),
                newActor(ACTOR_TYPE.USER,'montoya','Inigo',"Hello! My name is Inigo Montoya ...")
            ],
        })

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

        let expectedIR = createExpectedIR({
            actors : [ 
                newActor(ACTOR_TYPE.AGENT,'vi','Vizzini',"Inconceivable!", ['BadGuy']),
                newActor(ACTOR_TYPE.USER,'montoya','Inigo',"Hello! My name is Inigo Montoya ...", ['GoodGuy'])
            ],
        })

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
        
        let expectedIR = createExpectedIR({
            actors : [
                newActor(ACTOR_TYPE.AGENT,'vi','Vizzini',"", ['BadGuy']),
                newActor(ACTOR_TYPE.USER,'montoya','Inigo',"", ['GoodGuy'])
            ],
            annotations : {
                "BadGuy" : newAnnotation('BadGuy',[newAnnotationDefElement(ANNOTATION_KEY.COLOR,'blue')]),
                "GoodGuy" : newAnnotation('GoodGuy', [newAnnotationDefElement(ANNOTATION_KEY.PROTO,'good')])
            },
        })

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

        let expectedIR = createExpectedIR({
            actors : [
                newActor(ACTOR_TYPE.AGENT,'vi','Vizzini',"", ['BadGuy']),
                newActor(ACTOR_TYPE.USER,'montoya','Inigo',"", ['GoodGuy']),
                newActor(ACTOR_TYPE.STORE,'pod','Pit of Despair',"", ['BadGuy']),
            ],
            annotations : {
                "BadGuy" : newAnnotation("BadGuy",[newAnnotationDefElement(ANNOTATION_KEY.COLOR,'red')]),
                "GoodGuy" : newAnnotation('GoodGuy',[newAnnotationDefElement(ANNOTATION_KEY.PROTO,'good')])
            },
        })
        

        parseAndCompare(testProgram,expectedIR)
    })

    it("Parses a container of element correctly", function() {
        let testProgram = String.raw`
            store 'Pit of Despair' as pod;

            container 'Good Guys' as gg {
                user 'Inigo' as montoya is @GoodGuy, @Swashbuckler
                user 'Buttercup' as bc

                @Swashbuckler {
                    color : 'orange';
                }
            };

            container 'Bad' as bg {
                agent 'Vizzini' as vi is @BadGuy
                
                vi -('kidnaps')-> bc

                vi --> pod
            };

            @BadGuy {
                color : 'red';
            };

            @GoodGuy {
                prototype : 'good';
            };
        `

        let vi_bc_channel = newChannel(CHANNEL_TYPE.REQ_RES,'vi','bc',"kidnaps")
        let vi_pod_write = newDataFlow(DATA_FLOW_TYPE.WRITE,'vi','pod')
        let expectedIR = createExpectedIR({
            actors : [
                //note that order of actors is important - depends on parsing order
                newActor(ACTOR_TYPE.USER,'montoya','Inigo',"", ['GoodGuy','Swashbuckler']),
                newActor(ACTOR_TYPE.USER,'bc','Buttercup',"", []),
                newActor(ACTOR_TYPE.AGENT,'vi','Vizzini',"", ['BadGuy']),
                newActor(ACTOR_TYPE.STORE,"pod","Pit of Despair"),
                
            ],
            channels : [
                vi_bc_channel,
            ],
            data_flows : [
                vi_pod_write
            ],
            annotations : {
                "BadGuy" : newAnnotation("BadGuy",[newAnnotationDefElement(ANNOTATION_KEY.COLOR,"red")]),
                "GoodGuy" : newAnnotation("GoodGuy",[newAnnotationDefElement(ANNOTATION_KEY.PROTO,"good")]),
                "Swashbuckler" : newAnnotation("Swashbuckler",[newAnnotationDefElement(ANNOTATION_KEY.COLOR,"orange")]),
            },
            containers : {
                "gg" : newContainer("gg","Good Guys",['montoya','bc'],[],[],['Swashbuckler'],[]),
                "bg" : newContainer("bg","Bad",['vi'],[vi_bc_channel.id],[vi_pod_write.id],[],[]),
            },
        })

        parseAndCompare(testProgram,expectedIR)
    })

    it("Parses a nested container correctly", function() {
        let testProgram = String.raw`

            user 'Shopper' as s;

            container 'System' as sys {

                container 'Frontend' as fe {
                    agent 'Shop UI' as ui
                }

                container 'Backend' as be {
                    agent 'Gateway' as gw
                    agent 'Auth' as au
                    store 'Data' as data
                }
            };
        `

        let expectedIR = createExpectedIR({
            actors : [
                newActor(ACTOR_TYPE.USER,'s','Shopper'),
                newActor(ACTOR_TYPE.AGENT,'ui','Shop UI'),
                newActor(ACTOR_TYPE.AGENT,'gw','Gateway'),
                newActor(ACTOR_TYPE.AGENT,'au','Auth'),
                newActor(ACTOR_TYPE.STORE,'data','Data'),
            ],
            containers : {
                'fe' : newContainer('fe','Frontend',['ui'],[],[],[],[]),
                'be' : newContainer('be','Backend',['gw','au','data'],[],[],[],[]),
                'sys' : newContainer('sys','System',[],[],[],[],['fe','be'])
            }
        })

        parseAndCompare(testProgram,expectedIR)
    })
})