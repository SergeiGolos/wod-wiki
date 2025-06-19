## Properties

- `Statements` : Array of [ICodeStatement](ICodeStatement.md)
- `Soruce` : original pre-compiled script.

## Methods

- `from(ids: number[], index:number) : ICodeStatement[]` : used by the runtime block next function to identify the grouping of `ICodeStatement` blocks that will generate the next `IRuntimeBlock`  (this is where the special `lap` fragments would impact how a `IRuntimeBlock` is composed.)
- `getId(id: number): ICodeStatement | undefined`
- `getAt(index: number): ICodeStatement | undefined`