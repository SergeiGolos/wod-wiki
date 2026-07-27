# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues on
`github.com/SergeiGolos/wod-wiki`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Pre-existing label vocabulary

This repo predates the canonical triage labels. The following labels are already in use
and should be left alone (do not rename or repurpose):

| Label | Meaning |
|---|---|
| `bug` | Something isn't working |
| `enhancement` | New feature or request |
| `documentation` | Improvements or additions to documentation |
| `duplicate` | This issue or PR already exists |
| `help wanted` | Extra attention is needed |
| `good first issue` | Good for newcomers |
| `invalid` | This doesn't seem right |
| `question` | Further information is requested |
| `dependencies` | Pull requests that update a dependency file |
| `Brainstorm` | Open design conversation in progress |
| `clarify` | Needs clarification before work can begin (closest pre-existing analogue to `needs-info`) |
| `on-hold` | Work is paused pending an external trigger |
| `GUPPI` | Issues assigned to GUPPI for automated processing |

The five canonical triage labels (`needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`) are layered on top of these — see
`docs/agents/triage-labels.md`. `wontfix` already exists; the other four are
created on demand by the `triage` skill.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api --method POST repos/<owner>/<repo>/issues/<map>/sub_issues -F sub_issue_id=<child-db-id>`). Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies** — the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only — the live gate). A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh api repos/<owner>/<repo>/issues/<map>/sub_issues`), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me` — the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.