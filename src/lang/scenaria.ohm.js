
const grammar = String.raw`
Scenaria {
	
    Program = ProgramElements
     
    SingleStatement = Statement ";"
    ProgramElement = SingleStatement | comment
    ProgramElements = (ProgramElement )? (~";" ProgramElement)*
  
    reserved_word = actor | as | store | user

     actor = "actor"
     store = "store"
     as = "as"
     user = "user"

     ///---------- Statements
     
     Statement = ActorDef | StoreDef | UserDef | SyncCall | AsynchCall | DataFlowWrite | DataFlowRead
     
     ActorDef = actor TextLiteral as ident
     StoreDef = store TextLiteral as ident
     UserDef = user TextLiteral as ident
     
     ReqResChannel = "-(" TextLiteral? ")->"
     SyncCall = ident ReqResChannel ident

     AsynchChannel = "-(" TextLiteral? ")-\\"
     AsynchCall = ident AsynchChannel ident
     
     DataFlowWrite = ident "-->" ident
     DataFlowRead = ident "<--" ident
     
     textCharacter = alnum | space
     TextLiteral = "'" textCharacter* "'"
     //Say = say TextExpr
     TextExpr = TextExpr "++" TextLiteral --concat
     | TextLiteral

     ///----------- Other complementary definitions
     identStart = "_" | letter
     identChar = "_" | alnum
     full_ident = identStart identChar*

     ident = ~reserved_word full_ident

     comment = "//" (~"\n" any)*
 }



`

module.exports = { 
    grammar
}