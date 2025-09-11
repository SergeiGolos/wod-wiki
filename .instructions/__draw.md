--------------------------------------------------------------------------------
alwaysApply: false
Draw Agent — Design → Obsidian Canvas (auto-sized, auto-linked)
Purpose
Convert any design brief/spec into an Obsidian Canvas map, where each major concept becomes a node sized by importance/complexity and linked to the correct Markdown or source files in the repo. Outputs integrate with .blackboard/specs/{feature}/ and respect .ground/ conventions to minimize cognitive load and improve synchronization.
When to Trigger
• When asked to visualize a design, architecture, RFC, or system plan
• When invoked by: make canvas from design
Required Inputs
• design_source: path or pasted text of the design (Markdown, RFC, Notion export, or README section)
• repo_root: current workspace root (auto-detect)
• feature_or_ticket: slug used under .blackboard/specs/{feature_or_ticket}/
• link_conventions (Obsidian-style):
    ◦ Feature docs live under .blackboard/specs/{feature_or_ticket}/
Output Artifacts
1. A saved Obsidian Canvas at .blackboard/specs/{feature_or_ticket}/{design-slug}.canvas
2. Any missing stub notes for people/tech/files as Markdown under docs/ with frontmatter
3. Cross-links from Canvas nodes to .blackboard/specs/{feature_or_ticket}/design.md, requirements.md, testing.md, and tasks.md when present
Canvas Node Defaults
• Use text nodes for summaries and decisions; file nodes to point at repo files; link nodes only for external URLs
• Node style, semantic colors:
    ◦ Design sections: gray #ECEFF1
    ◦ Decisions: blue #EAE6FF
    ◦ Risks: red #FFEBEE
    ◦ Tasks/Milestones: green #E8F5E9
    ◦ Interfaces/APIs: purple #E9D5FF
• Heights: 160 for text/decision; 120 for file/link nodes
Sizing & Layout Heuristics
Size Factors (score 1–5 each)
• Scope: number of subsections or headings the concept owns
• Complexity: algorithmic complexity, cross-cutting concerns, or required expertise
• Dependencies: number of inbound/outbound links/edges
• Volatility: likely to change (early design, risky assumptions)
• Impact: user-facing risk or business criticality
Node Width Mapping
• width = 240 + 60 * clamp(round((scope+complexity+dependencies+volatility+impact)/5), 1, 8)
Auto-sizing Shortcuts
• If a node maps to a file with >500 LOC or a Markdown with >10 headings, bump width tier by +1
• If a node is a risk, minimum width tier = 4
• If a node is a leaf task, minimum width tier = 2
Layout Convention
• Radial from the main title: core at center; interfaces east; data/storage south; risks north; timeline west
• Orthogonal routing for edges; avoid crossing by y-strata per category; snap to 20px grid
Linking Policy
• Prefer file nodes with relative path to repo Markdown or source
• Prefer linking design sections to .blackboard/specs/{feature_or_ticket}/design.md#section-slug
• If no existing repo file matches a node concept, create a stub under .blackboard/specs/{feature_or_ticket}/{slug}.md and link it
Canonical .canvas JSON Schema (subset)
{
  "nodes": [
    {
      "id": "auto-uuid",
      "type": "text|file|link",
      "text": "Optional: summary text (for text nodes)",
      "file": "relative/path/to/file.md",
      "url": "https://... (for link)",
      "x": 0,
      "y": 0,
      "width": 360,
      "height": 160,
      "color": "#DEE2E6",
      "labels": ["design", "risk", "api", "task"]
    }
  ],
  "edges": [
    {
      "id": "edge-uuid",
      "fromNode": "node-id-A",
      "toNode": "node-id-B",
      "fromSide": "right",
      "toSide": "left",
      "label": "depends on"
    }
  ]
}
Extraction & Mapping Steps
1. Parse the design into sections: Title, Goals, Non-Goals, Key Components, Data Models, Interfaces/APIs, Risks, Open Questions, Milestones/Tasks
2. Generate candidates for nodes from headings, lists, and callouts; merge near-duplicates
3. Score each candidate on the five size factors; compute width tier and final size
4. Resolve links:
    ◦ Match node titles to repo files by fuzzy search over src/, packages/, infra/, and .blackboard/specs/{feature_or_ticket}/
    ◦ Where no file exists, create a stub under .blackboard/notes/ using the category folder.
    ◦ Replace inline mentions of people/tech with wiki links
    ◦ Prefer relative paths and OS-agnostic separators
5. Lay out nodes per the radial convention; snap to 20px grid
6. Emit a .canvas file under .blackboard/specs/{feature_or_ticket}/{design-slug}.canvas and write any needed stubs
7. Validate: ensure all edges reference existing node IDs; file paths are relative; no orphan nodes
Quality Gates
• ≥90% of nodes resolve to either a valid file path or include at least one wiki link
• No orphan nodes; each component has at least one dependency or data-flow edge
• File paths are relative and OS-agnostic; no absolute machine paths
• Canvas opens in Obsidian with no schema warnings
• Nodes referencing .blackboard/specs/{feature_or_ticket}/ exist or are created prior to linking
Cognitive Alignment (Blackboard & Brain)
• Externalize complex design structure into a navigable visual artifact to reduce working-memory load
• Use semantic colors and labels as “beacons” to speed comprehension
• Link to .blackboard/specs/{feature_or_ticket}/design.md, requirements.md, testing.md, and tasks.md to preserve a single source of truth (DRY)
• Keep nodes concise; push detail into linked docs to minimize extraneous cognitive load
One‑Shot Command Template
Using the rule "Design → Canvas Map with Repo Links":
Input design: <paste or path>
Repo root: <auto-detect>
Feature: <feature_or_ticket>
Produce: docs/canvas/<slug>.canvas with nodes sized per the five-factor heuristic, laid out radially, and with file nodes pointing to existing repo files when possible. Create missing stubs as needed. Include risks (red), decisions (blue), APIs (purple), milestones (green), and neutral for design sections. Prefer links into .blackboard/specs/<feature_or_ticket>/.
Return: A brief summary and the path of the created canvas.
Example (minimal) Output Nodes
{
  "nodes": [
    {"id":"n-title","type":"text","text":"Design: Event Ingestion Service","x":0,"y":0,"width":540,"height":160,"color":"#ECEFF1","labels":["design"]},
    {"id":"n-api","type":"text","text":"Public API: POST /v1/events\n[[tech/OpenAPI]]","x":600,"y":0,"width":420,"height":160,"color":"#EAE6FF","labels":["api"]},
    {"id":"n-parser","type":"file","file":"src/ingestion/parser.ts","x":300,"y":220,"width":360,"height":120,"color":"#ECEFF1","labels":["component"]},
    {"id":"n-risk","type":"text","text":"Risk: backpressure under peak load","x":0,"y":-240,"width":480,"height":160,"color":"#FFEBEE","labels":["risk"]},
    {"id":"n-milestone","type":"text","text":"Milestone: M1 MVP (2 weeks)","x":-520,"y":0,"width":360,"height":160,"color":"#E8F5E9","labels":["task"]}
  ],
  "edges": [
    {"id":"e1","fromNode":"n-api","toNode":"n-parser","fromSide":"bottom","toSide":"top","label":"drives"},
    {"id":"e2","fromNode":"n-risk","toNode":"n-parser","fromSide":"bottom","toSide":"top","label":"stress point"}
  ]
}