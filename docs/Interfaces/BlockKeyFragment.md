# BlockKeyFragment Class Documentation

## Description
Represents a fragment of a hierarchical block key, used to identify and index blocks within the execution tree.

## Original Location
`src/core/BlockKeyFragment.ts`

## Properties
- `ids: number[]` — Array of block IDs in the hierarchy
- `index: number` — Index of this fragment in the hierarchy

## Usage
Used to build [[BlockKey]] objects for uniquely identifying runtime blocks.

## Relationships
- Used by: [[BlockKey]]
- Related to: [[IRuntimeBlock]], [[JitStatement]]
