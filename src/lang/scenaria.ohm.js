

const KEYWORDS = {
    actor : "actor",
    store : "store",
    as : "as",
    user : "user"
}

const grammar = String.raw`
Scenaria {
	
    Program = ProgramElements
     
    SingleStatement = Statement ";"
    ProgramElement = SingleStatement | comment
    ProgramElements = (ProgramElement )? (~";" ProgramElement)*
  
    reserved_word = actor | as | store | user

    ${Object.keys(KEYWORDS)
        .map(k => `${k} = "${KEYWORDS[k]}"`)
        .join("\n")}

     ///---------- Statements
     
     Statement = ActorDef | StoreDef | UserDef | SyncCall | AsynchCall | DataFlowWrite | DataFlowRead | Scenario
     
     ActorDef = actor TextLiteral as ident
     StoreDef = store TextLiteral as ident
     UserDef = user TextLiteral as ident
     
     ReqResChannel = "-(" TextLiteral? ")->"
     SyncCall = ident ReqResChannel ident

     AsynchChannel = "-(" TextLiteral? ")-\\"
     AsynchCall = ident AsynchChannel ident
     
     DataFlowWrite = ident "-->" ident
     DataFlowRead = ident "<--" ident

     Scenario = TextLiteral "{" Step* "}"
     
     Step = SyncCallStep | AsynchCallStep | SyncResponse | DataWrite | DataRead
     
     SyncCallStep = ident "-(" TextLiteral ")->" ident
     AsynchCallStep = ident "-(" TextLiteral ")-\\" ident
     
     DataWrite = ident "-" TextLiteral "->" ident
     DataRead = ident "<-" TextLiteral "-" ident
     
     SyncResponse = ident "--(" TextLiteral ")--<" ident
     
     textCharacter = alnum | space
     TextLiteral = "'" textCharacter* "'"
     
     ///----------- Other complementary definitions
     identStart = "_" | letter
     identChar = "_" | alnum
     full_ident = identStart identChar*

     ident = ~reserved_word full_ident

     comment = "//" (~"\n" any)*
 }



`

module.exports = { 
    grammar,
    KEYWORDS
}