

const KEYWORDS = {
    agent : "agent",
    store : "store",
    as : "as",
    user : "user",
    note : "note",
    for : "for",
    color : "color",
    is : "is",
    prototype : "prototype",
}

const grammar = String.raw`
Scenaria {
	
    Program = ProgramElements
     
    SingleStatement = Statement ";"
    ProgramElement = SingleStatement | comment
    ProgramElements = (ProgramElement )? (~";" ProgramElement)*
  
    reserved_word = ${Object.values(KEYWORDS).join(" | ")}

    ${Object.keys(KEYWORDS)
        .map(k => `${k} = "${KEYWORDS[k]}"`)
        .join("\n")}

     ///---------- Statements
     
     Statement = AgentDef | StoreDef | UserDef | SyncCall | AsynchCall | DataFlowWrite | DataFlowRead | Scenario | Note | AnnotationDef | AnnotationAssignment
     
     AgentDef = agent TextLiteral as ident AnnotationAssignmentClause?
     StoreDef = store TextLiteral as ident AnnotationAssignmentClause?
     UserDef = user TextLiteral as ident AnnotationAssignmentClause?
     
     Note = note for ident ":" TextLiteral

     ReqResChannel = "-" "(" TextLiteral? ")" "->"
     SyncCall = ident ReqResChannel ident

     AsynchChannel = "-" "(" TextLiteral? ")" "-\\\\"
     AsynchCall = ident AsynchChannel ident
     
     DataFlowWrite = ident "-->" ident
     DataFlowRead = ident "<--" ident

     Scenario = TextLiteral "{" Step* "}"
     
     Step = SyncCallStep | AsynchCallStep | SyncResponse | DataWrite | DataRead
     
     SyncCallStep = ident "-" "(" TextLiteral ")" "->" ident
     AsynchCallStep = ident "-" "(" TextLiteral ")" "-\\" ident
     
     DataWrite = ident "-" TextLiteral "->" ident
     DataRead = ident "<-" TextLiteral "-" ident
     
     SyncResponse = ident "--(" TextLiteral ")--<" ident
     
     punct = "(" | ")" | "!" | "@" | "#" | "$" | "," | "." | "-" | ":"
     textCharacter = alnum | space | punct
     TextLiteral = "'" textCharacter* "'"
     
     ///------------- Annotations

     annotationRef = "@" ident
     AnnotationRefList = (annotationRef)? ("," annotationRef)*
     AnnotationAssignment = ident AnnotationAssignmentClause
     AnnotationAssignmentClause = is AnnotationRefList
     
     AnnotationDef = "@" ident "{"  AnnotationStatement* "}"
     AnnotationStatement = (AnnotColorStmt | AnnotProtoStmt) ";"
     AnnotColorStmt = color ":" TextLiteral
     AnnotProtoStmt = prototype ":" TextLiteral

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