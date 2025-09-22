# Data Model: Documentation Artifacts

## Entities
- DocumentPage
  - id, title, path, section (overview | language | runtime | ui | metrics | interface)
  - links[] (absolute repo paths), diagrams[] (Mermaid blocks), owner, lastUpdated
- InterfaceReference
  - name, description, methods[], knownImplementations[], links[]
- LanguageConcept
  - token, rule, example, notes, links[]
- RuntimeEvent
  - type, timestamp semantics, context, deterministicOrdering

## Relationships
- DocumentPage → many InterfaceReference (cross-links)
- DocumentPage → many LanguageConcept (for language guide)
- RuntimeEvent referenced in runtime docs and examples

## Validation Rules
- All links must resolve to existing files.
- Mermaid diagrams must render in GitHub (syntax check).
- Each InterfaceReference must list at least one known implementation or mark TODO.
