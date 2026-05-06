## Plan: Playground Template-Embedded Home

Keep the current `/playground` route model, but move the home guidance into the playground note template itself instead of rendering a separate pre-editor React panel. The target is a hybrid note: editable markdown for most of the narrative, plus a small number of locked `widget:` sections for richer control explanations that should render inside the editor surface but not be edited as plain prose.

**Steps**
1. Phase 1 — Remove external playground guide chrome
Stop treating [playground/src/components/PlaygroundGuidePanel.tsx](playground/src/components/PlaygroundGuidePanel.tsx) as the source of truth for the playground home. The guidance should live in the note template loaded by [playground/src/pages/PlaygroundNotePage.tsx](playground/src/pages/PlaygroundNotePage.tsx), not as a separate component inserted above the editor.
2. Phase 1 — Define the template content split
Convert the useful content from [playground/src/components/HomeWelcome.tsx](playground/src/components/HomeWelcome.tsx) into a hybrid note structure: regular markdown for headings, explanation, and doc links; a limited number of locked injected sections for control-group explanations or richer callouts. Based on current research, prefer markdown first and use injected UI only where markdown cannot express the needed presentation cleanly.
3. Phase 1 — Use editor-native widget injection instead of raw HTML
Do not depend on raw HTML rendering as the main mechanism. [playground/src/canvas/CanvasProse.tsx](playground/src/canvas/CanvasProse.tsx) currently supports GFM markdown but does not enable raw HTML, while [src/components/Editor/NoteEditor.tsx](src/components/Editor/NoteEditor.tsx) already supports non-editable injected UI through `widgetComponents` and `WidgetCompanion`. The recommended path is to embed ` ```widget:<name>` sections in the template and register the required widget components on the playground note page.
4. Phase 2 — Create a real playground-home template
Replace the current default playground source in [playground/src/templates/defaultPlaygroundContent.ts](playground/src/templates/defaultPlaygroundContent.ts) with a dedicated playground-home template file rather than a bare sample script import. That template should include: the starter workout, the explanatory markdown, and any `widget:` sections needed for locked UI.
5. Phase 2 — Register playground-home widgets on the note page
Extend [playground/src/pages/PlaygroundNotePage.tsx](playground/src/pages/PlaygroundNotePage.tsx) to pass a widget registry into [src/components/Editor/NoteEditor.tsx](src/components/Editor/NoteEditor.tsx). Implement small focused widget components under [src/components/Editor/widgets](src/components/Editor/widgets) or a playground-local equivalent for the non-editable blocks required by the template.
6. Phase 2 — Preserve explicit blank-note creation
Keep the `New` action on the playground route creating an actually empty playground note via [playground/src/templates/new-playground.md](playground/src/templates/new-playground.md) and [playground/src/pages/shared/PlaygroundNoteActions.tsx](playground/src/pages/shared/PlaygroundNoteActions.tsx). Only the default home/reset path should load the richer playground-home template.
7. Phase 3 — Validate renderer gaps before widening scope
As the template is moved into the note, identify any missing renderer capabilities one by one: markdown-only callouts, widget rendering, link styling, frontmatter handling, and any need for small TSX widgets. Only add new rendering behavior if the existing markdown + widget system cannot express the desired section.
8. Phase 3 — Add display-only not-found state inside the same note/editor model
Keep the planned not-found work, but implement it as another template-driven playground note state rather than separate chrome. That keeps the route architecture aligned: playground home, empty playground, and not-found playground are all note/template variants.

**Relevant files**
- /home/serge/projects/wod-wiki/playground/src/pages/PlaygroundNotePage.tsx — where the note template is loaded and where widget registration will need to be wired
- /home/serge/projects/wod-wiki/playground/src/templates/defaultPlaygroundContent.ts — current playground default content source to replace with a richer template-backed source
- /home/serge/projects/wod-wiki/playground/src/templates/new-playground.md — explicit empty playground template that should remain for the `New` action
- /home/serge/projects/wod-wiki/playground/src/pages/shared/PlaygroundNoteActions.tsx — reset/new semantics to preserve while changing the default template
- /home/serge/projects/wod-wiki/playground/src/components/HomeWelcome.tsx — source material to migrate into markdown/template content
- /home/serge/projects/wod-wiki/playground/src/components/PlaygroundGuidePanel.tsx — likely to remove or retire once template-embedded guidance replaces it
- /home/serge/projects/wod-wiki/playground/src/canvas/CanvasProse.tsx — confirms GFM markdown support and current raw-HTML limitation
- /home/serge/projects/wod-wiki/src/components/Editor/NoteEditor.tsx — existing editor support for non-editable injected `widget:` sections
- /home/serge/projects/wod-wiki/src/components/Editor/overlays/WidgetCompanion.tsx — widget rendering contract and config shape
- /home/serge/projects/wod-wiki/src/components/Editor/widgets/HeroCarousel.tsx — example widget implementation pattern to reuse
- /home/serge/projects/wod-wiki/playground/src/hooks/useZipProcessor.ts — import path that will eventually need to select template-driven not-found behavior
- /home/serge/projects/wod-wiki/playground/src/pages/LoadZipPage.tsx — invalid-import entry path

**Verification**
1. Visiting `/playground` creates and opens a note whose content itself contains the home guidance and starter workout, without relying on a separate guide panel above the editor.
2. The markdown sections render correctly inside the existing editor/view flow.
3. Any locked non-editable sections render through registered `widget:` blocks inside the same note surface.
4. The `New` action still creates an empty playground note, while reset restores the richer playground-home template.
5. The guide panel component can be removed or left unused without losing any required playground-home behavior.
6. Run targeted unit tests for the template source, widget components, and playground actions.
7. Add/update acceptance coverage for default playground load, reset-to-home-template, and empty-note creation.

**Decisions**
- Included now: move playground-home guidance into the note template itself.
- Included now: use a hybrid of markdown plus limited non-editable `widget:` sections.
- Included now: keep empty playground creation distinct from the default playground-home template.
- Excluded: enabling general raw HTML editing/rendering as the primary solution unless markdown + widgets proves insufficient.
- Follow-up: after template embedding is stable, continue with the not-found note state and any remaining home-to-playground migration work.
