
# Scenaria Language

The Scenaria language is a simple domain-specific language that is intended to describe a software system's structure and high level scenarios.

Here we describe the system's syntax, with some examples.  
The concrete full syntax definition can be seen in the ohm [syntax definition file](../src/lang/scenaria.ohm.js).

## Basic Model

A given Scenaria file describes one system and relevant scenarios, in the same file.

The description must start with enumerating all the participating components.
There are 2 main types of components:
- An **Agent**: an _active_ component in the system - it does something and communicates with other components.
    - Can also be a **User** actor.
    - Agents and Users are also referred to as "actors"
    - Visually denoted by a right-angled rectangle.
        - A user actor is denoted by a person figure.
- A **Store**: a data storage, a passive component. It can refer to a database, a file or even a simple array in memory (depending on the level of description you adopt). Essentially any place a data is "stored" or accessed.
    - Visually denoted by a rounded-corner rectangle.


Active components ('agent', 'user') communicate over channels.
A channel can be a request-response (synchronous) channel or an asynchronous channel (sending a message/event).  
Visually, channels are denoted by circles with edges connecting to the respective actors.

Agents read and write data from stores. Only an agent can either read or write data. It can either read or write, or both.  
Visually, this is denoted by edges between the agent and the store, with an arrow pointing to to the direction of the data flow. So a write flow would be denoted by an arrow incoming into the store, and a read would be denoted by an arrow coming into the reading agent.

## Scenaria Syntax

A scenaria file must contain an enumeration of the components in the system.
It can optionally contain a list of scenarios.

Optionally, you can also denote a channel or data flow, without using them in any scenario. If a scenario describes some interaction between two components that don't have a channel of flow defined for them, the relevant channel/flow will be lazily created and added to the model.  
This is intentional to allow for quick prototyping, without the need to be explicit about all communication channels.

The syntax definition can be found in [here](../src/lang/scenaria.ohm.js).

### Preliminary Definitions

An **identifier** is a series of alphanumeric characters (english + numbers) or an underscore, with no whitespace. It can start with an an underscore, but not a number.  
An identifier cannot be a reserved word.

Reserved words are:
- `user`
- `agent`
- `store`
- `as`
- `note`
- `for`
- `is`
- `color`
- `prototype`
- `container`

A **text literal** is a series of any alphanumeric characters, with space, enclosed in single quotes (`'`).

A comment can be added using double forward slashes. Anything after the forward slashes to the end of the line is ignored.

### Actors

The definition of all types of actors follows a simple syntax:  
```<component type> <caption> as <id>;```

where:
- Component type is one of: `user`, `agent` or `store`
- Caption is a text literal, to be shown for the component in the diagram.
- ID is an identifier to be used in the rest of the description to refer to the component.

Examples:
```
user 'Shopper' as u;
agent 'Cart Service' as cs;
agent 'Order Service' as os;
store 'Cart Data' as cd;
store 'Inventory' as i;
```

#### Notes

You can specify a note for an actor by referring to an id of a defined actor:
```
note for u: 'A simple user';
```

The actor must already be defined before the note definition. The note consists of a single sentence enclosed in quotes.
Notes will be shown as tooltips on the diagram and can also be toggled on/off in the application using the "Notes" checkbox.

#### Annotations
You can define annotations as a way to add metadata to actors (agents, stores, users).
These annotations can provide some visual cues to clarify some concept or grouping in the system you're modeling.

Using annotations is done in two steps:
1. Assigning the annotation to actors ( = tagging the actors with an annotation).
2. Defining the annotations - what visual cues will it add to the actors tagged with it.

##### Assigning Annotation to Actors

Tagging an actor with an annotation can be done in two ways
- An annotation assignment clause in the actor definition; e.g. `agent 'Order Service' as os is @External;`
 - The `@External` is the annotation.
 - General syntax in this case is `<actor definition> as <actor id> is <annotation>;`
- A separate annotation assignment clause; e.g. `cd is @Mem;`
 - In this case, `cd` is an id of a previously defined actor.
 - `@Mem` is a reference to an annotation defined elsewhere in the program.

In both cases you can define a list of annotation references, separated by a comma. All of the annotations will be assigned to the actor.  
For example:
```
i is @External, @DB;
```
In this case , `i` is an id of an actor and `@External`, `@DB` are refrences to annotation definitions.

Annotations that are not defined will do nothing, but will not result in an error.

##### Defining an Annotation

Referring to annotations is not enough. In order to have some effect, you need to define what visual cues will be applied to actors tagged with the referenced annotations.
Annotation definitions define what kind of cues to apply.

Syntatically, annotations definitions look like this:
```
@<annotation id> { <annotation statements> };
```
where 
- annotation id is a valid identifier.
- annotation statements are a list of statement specifying the change in looks.

Annotation statements are separated by semicolons.

We currently support 2 annotation statements:
- Color: `color: '<color value>';`
 - Example: `color: 'lightblue';`
 - color value can be any valid CSS color value, provided here as a text literal.
- Prototype: `prototype: <prototype string>;`
 - Example: `prototype: 'memory';`
 - The prototype string will be added to the actor's caption as a prefix, enclosed in double angle brackets, e.g. `<<memory>>`.

These are (currently) the only values that can be defined and have any effect.

If an actor is tagged with two annotations that both define the same key, e.g. two annotations with a `color` statements, the behavior is undefined.

Some example definitions:
```
@DB { 
    prototype : 'db';
};

@Mem {
    prototype : 'memory';
};

@External {
  color : 'lightblue';
  prototype: 'external';
};
```

### Channel and Data Flow Definitions

As noted above, channel and data flow statements are not mandatory, and will be automatically deduced from scenario definitions.

However, it's very likely you'll want to describe a system without a scenario, or the scenario definition don't include an interaction over a channel/data flow that actually exists and you'd want to include it in the description.  
For this reason, it's possible to simply "statically" describe channels and data flows.

A channel can be denoted using a syntax that depends on the channel type.

A request-response channel is denoted using the following syntax:  
```<actor id> -( <description> )-> <actor id>```

where:
- Actor id are IDs of previously defined actors.
- Description is a text literal. It is optional.

Note the arrow points at the receiver of the call (the component being requested).


An asynchrounous channel is similar in syntax to a synchronous channel, only the arrow shape is different:  
```<actor id> -( <description> )-\\ <actor id>```

Examples:
```
u -()-> cs;
u -('adding items')-> cs;
cs -()-\\ os;
```

Data flow definitions are simple arrows showing the direction of the data flow:  
For write:  
```<agent id> --> <store id>```

For read:  
```<agent id> <-- <store id>```

Examples:
```
cs --> cd;
cs <-- cd;
```

### Containers

It's possible to group actors and data flows into containers that will be drawn as part of the diagram.  
The syntax for a container is:  
```
container <name> as <id> { 
    <other definitions ... >
}
```

Example:
```
container 'Backend' as be {
    agent 'Gateway' as gw
    agent 'Auth' as au
    store 'Data' as data

    gw -('authenticate')-> au

    gw <-- data
};
```

Containers can also be nested:
```
container 'System' as sys {

    container 'Frontend' as fe {
        agent 'Shop UI' as ui
    }

    container 'Backend' as be {
        agent 'Gateway' as gw
        agent 'Auth' as au
        store 'Data' as data

        gw -('authenticate')-> au

        gw <-- data
    }
};
```


### Scenario Definition

After defining at least the components in the system, you can add scenarios to the description.  
You can add more than one scenario. 

A given scenario is a list of steps that happen with components in the system. Different scenarios as a result of some input of data values (a branch) should be described as a separate scenario.

Syntatically a scenario is denoted as a block of steps with a description:  
``` <description> { <list of steps> };```

where:
- Description is a text literal.
- Steps are defined one per line, using the syntax described below.

There are 5 types of steps:

**Synchronous Call**  
Syntax: ```<caller> -( <message> )-> <callee>```  
Example:  
```
u -('add item')->cs
```
`caller` and `callee` are actor IDs.  
`message` is a text literal.

**Synchronous Response**
Syntax: ```<caller> --( <response> )--< <callee>```

`caller` and `callee` are actor IDs.  
`response` is a text literal

**Asynchronous Call**  
Syntax: ```<producer> -( <message> )-\ <consumer>```  
Example: 
```
cs -('place order')-\os
```

`prodcuer` and `consumer` are actor IDs.  
`message` is a text literal.

**Data Write**  
Syntax: ```<writer> - <data> -> <store>```  
Example: 
```
cs - 'item' -> cd
```

`writer` and `store` are IDs.  
`data` is a text literal.

**Data Read**  
Syntax: ```<reader> <- <data> - <store>```  
Example:
```
cs <- 'item data' - i
```

`reader` and `store` are IDs.  
`data` is a text literal.

---
A complete example for a scenario would be:
```
'Add item happy' {
    u -('add item')->cs

    cs <-'item in cart'-cd
    cs <- 'item data' - i

    cs -('place order')-\os
    
    cs - 'item' -> cd
    u --('added')--< cs
};
```

(note how it ends with a semicolon as well.)

## A Complete Example

The following example describes a very basic e-commerce shopping cart system with two scenarios - one for failure and one for a "happy path".

```
user 'Shopper' as u;
agent 'Cart Service' as cs;
agent 'Order Service' as os;
store 'Cart Data' as cd;
store 'Inventory' as i;

note for i: 'All up-to-date inventory';

cs --> cd;
cs <-- cd;

'Add item happy' {
    u -('add item')->cs

    cs <-'item in cart'-cd
    cs <- 'item data' - i

    cs -('place order')-\os
    
    cs - 'item' -> cd
    u --('added')--< cs
};

'Add Item Failure' {
    u -('add item')->cs

    cs <-'item in cart'-cd
    cs <- 'item data' - i

    u --('no item')--< cs
};
```