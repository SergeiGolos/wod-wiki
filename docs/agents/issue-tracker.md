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