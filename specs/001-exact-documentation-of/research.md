# Research: Exact System Documentation & Discovery

## Unknowns and Clarifications (resolved)
- Docs location: Use `docs/` with GitHub‑friendly Markdown and Mermaid. Link from `README.md`.
- Diagram format: Mermaid diagrams embedded in Markdown. Keep image assets minimal.
- Ownership: Documentation changes reviewed with code PRs; maintainers own relevant sections.
- Versioning: Docs updated continuously; tag notable language/runtime changes in a "Version & Changes" section.

## Best Practices References
- GitHub Mermaid support: https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/
- Documentation structure: Overview → Deep dives → References → How‑tos

## Decisions
- Create `docs/Overview.md` as the single entrypoint.
- Create `docs/language/Guide.md` based on parser/lexer; add examples from tests.
- Create `docs/runtime/Runtime.md` (determinism, time control, events, debugging).
- Create `docs/ui/Display.md` (editor, components, Storybook paths).
- Create `docs/metrics/Metrics.md` (types, composition, inheritance, results spans).
- Create `docs/interfaces/*` one-pagers for key interfaces and known implementations.
- Add Mermaid sequence/class diagrams for core flows and interfaces.
- Add "Specification Discovery" index linking to existing unit tests, stories, and parser files.

## Alternatives Considered
- Hosting in Wiki only: Rejected to keep PR review flow with code.
- MDX in Storybook only: Useful but GitHub single‑page overview still needed.
