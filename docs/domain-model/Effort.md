---
tags: [domain-model]
store: efforts
keyPath: "slug"
db: wodwiki-db (v19)
---

# Effort

**Store:** `efforts` · **Key path:** `slug` · **Type source:** `packages/lang/src/effort-registry/types.ts`

Canonical exercise-effort entity (`IEffort` from `@bitcobblers/wod-wiki-lang`, no storage-local duplicate). The slug is the durable identity boundary — labels and aliases may vary.

## Fields

| Field                     | Type                                          | Notes                                                                  |     |
| ------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- | --- |
| `id`                      | string                                        | UUID                                                                   |     |
| `slug`                    | string                                        | KEY — canonical identifier: unique, lowercase, hyphenated              |     |
| `label`                   | string                                        | Primary human-readable name                                            |     |
| `aliases`                 | string[]                                      | Fuzzy matching                                                         |     |
| `baseAttributes`          | EffortBaseAttributes                          | { met, discipline?, disciplineFactor?, intensityTier? }                |     |
| `registrySource`          | 'bundled' \| 'user' \| 'synthetic-unresolved' | Where the record came from                                             |     |
| `derivation?`             | EffortDerivation                              | { parentSlug, coefficients, hardOverrides } — clone-based user efforts |     |
| `createdAt? / updatedAt?` | string                                        | ISO timestamps                                                         |     |
| `body?`                   | string                                        | Free-form markdown description                                         |     |
| `hints?`                  | Record<string, unknown>                       | Compiler hints consumed by strategies                                  |     |

## Indexes

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-discipline` | `baseAttributes.discipline` | no |  |
| `by-source` | `registrySource` | no |  |

## Relationships

### Outgoing (this row references)

- `derivation.parentSlug` → [[Effort]] — self — clone parent

### Incoming (referenced by)

- [[UnifiedEventRecord]].`effortSlug`

## Map

![[domain-model.canvas]]
