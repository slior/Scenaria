
A more complete language description is [here](./Language.md).
## Basics


A text literal is a sequence of texts enclosed in single quotes, e.g. 'Hello World'.  
Identifiers are alphanumeric strings, with no whitespace.
Idenfities must be unique in a given Scenaria program.

Unless otherwise noted, names are text literal and any id is an identifier.

## Actors

**Agent:**  
 Defines an active actor in the system.  
- Syntax: `agent` _agent name_ `as` _agent id_`;`
- Example: `agent 'Cart Service' as cs;`

**Store:**  
 Represents a passive actor that stores data.  
- Syntax: `store` _store name_ `as` _store id_`;`
- Example: `store 'Cart Data' as cd;`

**User:**  
 Represents a human user interacting with other actors.  
- Syntax: `user` _user name_ `as` _user id_`;`  
- Example: `user 'Shopper' as s;`  

### Notes
You can specify notes on actors.
- Syntax: `note for` _actor id_`:` _text_`;`
- Example: `note for u: 'A simple user';`
## Channels

**Synchronous Channel:**  
 Represents direct request-response interaction between agents.  
- Syntax: _source agent id_ `-(`_channel text_`)->` _target agent id_`;`  
- Example: `s -('add to cart')-> cs;`

**Asynchronous Channel:**  
 Represents message passing between agents asynchronously.  
- Syntax: _source agent id_ `-(`_channel text_`)-\\` _target agent id_`;`
- Example: `cs -('update inventory')-\\ inv_mgmt;`

## Data Flows

**Agent Writing to Store:**  
 Indicates an agent writing data to a store.

- Syntax: _agent id_ `-->` _store id_`;`
- Example: `cs --> cd;`

**Agent Reading from Store:**  
 Indicates an agent reading data from a store.  
- Syntax: _agent id_ `<--` _store id _`;`
- Example: `cs <-- cd;`
----
## Annotations  
You can define annotations to annotate different actors with different visual cues.

**Annotation Definition:**  
Defines a single annotation to be assigned to actors.

Syntax: `@`_annotation id_ `{` _annotation statements_ `};`

Annotation statements are the cues applied to an actor when it is drawn.  
It can be:
- A color: `color :` _color_ `;`
    - The color value is a text literal, with a valid CSS color designation.
- A prototype: `prototype :` _prototype_ `;`
    - The protoype is a text literal which will be shown on the actor drawing.

Examples:
```
@UI {
    color : 'green';
};

@External {
  color : 'lightblue';
};

@Mem {
    prototype : 'memory';
};

@DB {
    prototype: 'db';
};
```

**Annotation Assignment:**  
Once an annotation is defined, it can be assigned to an actor:

Syntax: _actor id_ `is` _list of annotation ids_ `;`  
    - the list of annotation ids is comma-separated.

Examples:
```
cd is @Mem;
i is @External, @DB;
```
----
## Scenarios

Define a scenario - a certain sequence of steps between the different actors.

Syntax: _scenario name_ `{` _sequence of steps_ `};`

**Comments:**  
You can write single line comments inside a scenario description using double slashes: `//this is a comment`.

### Steps

**Synchronous Call Step:**  
Indicates a synchronous call is made between actors.

- Syntax: _sender id_ `-(` _message_ `)->` _receiver id_
    - message is a text literal
- Example: `user -('save cart')-> sc`

**Synchronous Response:**  
Indicates a response to a synchronous call.
- Syntax: _sender id_ `--(` _response_ `)--<` _responder id_
    - response is a text literal
    - sender is the original sender, responder is the receiver that is now responding.
- Example: `user --( 'done' )-- sc`

**Asynchronous Call Step:**  
Indicates a message sent from one actor to another over some asynchronous channel.

- Syntax: _sender id_ `(` _message_ `)-\\` _receiver id_
    - message is a text literal
- Example: `sc -('order created')-\\ os`

**Data Write:**  
Indicates an actor writing to a store.

- Syntax: _writer id_ `-` _data written_ `->` _store id_
    - data written is a text literal
- Example: `sc - 'cart item' -> cart_data`

**Data Read:**
Indicates an actor reading from a store.

- Syntax: _reader id_ `<-` _data read_ `-` _store id_
    - data read is a text literal
- Example: `sc <- 'cart items' - cart_data`