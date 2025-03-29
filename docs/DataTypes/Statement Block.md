- id: `number;`  (unique number, also start index for the node in original code)
- type: `string;`  ℹ️ could be removed maybe?
- parents: `number[];` the Id stack of potential parent nodes on this statement.
- children: `number[];` the Id of any children for the current node.
- next: `number;` the Id of the next block after this block.
- meta: `SourceCodeMetadata;` - ℹ️ parser metadata around the statement ??
- fragments: `StatementFragment[];` - the effective elements of the syntax that defines 


### Statement Fragment Types:

TextFragment: 
	- "text"
	- string

LapFragment: 
	- "lap"
	- runtime

EffortFragment: 
	- "effort"
	- child ??? 

DurationFragment:
	IncrementFragment: "increment"
	TimerFragment: "timer"

RepFragment: "rep"

Metrics:

- DistanceFragment: "distance"

- ResistanceFragment: "resistance"

- RoundsFragment: "rounds"

