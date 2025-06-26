## Properties

- `statements` : Array of [ICodeStatement](ICodeStatement.md)
- `source` : original pre-compiled script.
- `errors?`: any[] | undefined - Optional array of parsing or compilation errors

## Methods

- `from(ids: number[], index:number) : ICodeStatement[]` : used by the runtime block next function to identify the grouping of `ICodeStatement` blocks that will generate the next `IRuntimeBlock`  (this is where the special `lap` fragments would impact how a `IRuntimeBlock` is composed.)
- `getId(id: number): ICodeStatement | undefined`
- `getAt(index: number): ICodeStatement | undefined`