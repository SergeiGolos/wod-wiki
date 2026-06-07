# Hero POC — markdown-encoded canvas pages

Five canvas pages in the playground's own `template: canvas` DSL, ready
to drop into `markdown/canvas/` to be picked up by the playground
router.

## Layout

```
markdown/
├── README.md                this file
├── hero-poc/                cover / index page — route /hero-poc
│   └── README.md
├── hero-poc-v1/             route /hero-poc/v1
│   └── README.md
├── hero-poc-v2/             route /hero-poc/v2
│   └── README.md
├── hero-poc-v3/             route /hero-poc/v3
│   └── README.md
├── hero-poc-v4/             route /hero-poc/v4
│   └── README.md
└── hero-poc-v5/             route /hero-poc/v5
    └── README.md
```

## Format used

Each file is a Markdown file with the same DSL the existing home page
uses:

- **Frontmatter**: `template: canvas`, `route: <path>`, `type: hero-poc`.
- **H1**: page hero. Heading attributes in `{...}` — `sticky`, `dark`,
  `full-bleed`. Each page also carries a `view` block that opens the
  right-hand editor pane.
- **H2 sections**: prose blocks. Section attributes include
  `sticky`, `#anchor`, `theme:violet|emerald|amber|sky|rose|slate`,
  `density:compact`, `full-bleed`, `dark`. The themes are real — they
  tint the section panel via
  `playground/src/canvas/canvasSectionUtils.ts:SECTION_THEME_STYLES`.
- **Code blocks the parser understands**:
  - ```` ```view ```` with `name:`, `state:`, `source:`, `runtime:`,
    `launch:`, `align:`, `width:`. `source:` is resolved by the canvas
    runtime — the `wods/examples/getting-started/...` paths the home
    page uses resolve under `markdown/canvas/...`, so the same
    convention is used here.
  - ```` ```command ```` with `target:` and a `pipeline:` list of
    `set-source`, `set-state`, `navigate`, `launch` steps.
  - ```` ```button ```` with `label:`, `target:`, optional `open:`, and
    a `pipeline:`. Renders as a button in the section.
  - ```` ```example ```` with `label:` and `source:`. Renders as a
    chip-style switcher that re-sources the `view` to the chosen
    example.

## Promoting into the playground

To make these routes live in the playground:

1. Copy the five `hero-poc*/` folders into `markdown/canvas/`.
2. The playground's canvas router picks them up automatically (it
   scans `markdown/canvas/*/README.md` for files with
   `template: canvas`).
3. Open `http://localhost:5173/hero-poc/v1` (etc.) to see the page
   rendered.

The `wods/examples/getting-started/...` source paths used in every
`view` and `example` block resolve under `markdown/canvas/...` via
`playground/src/canvas/canvasUtils.ts:resolveSource`, so they work
without any further setup.

## Theme assignment per POC

| POC | Plan | Run | Read / review |
|---|---|---|---|
| v1 | violet | emerald | amber |
| v2 | rose | amber | sky |
| v3 | emerald | (no per-section theme) | amber |
| v4 | violet | emerald | amber |
| v5 | rose | amber | violet |

The themes are real — they tint the section panel border, accent, and
progress bar with the matching `from-{colour}-500` gradient. They
*are* the way the playground already colours sections.
