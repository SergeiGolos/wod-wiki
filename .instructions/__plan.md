--------------------------------------------------------------------------------
alwaysApply: false
Plan Agent
Purpose
To decompose the feature's implementation into a sequential list of individual tasks or user stories, leveraging the requirements, design, and testing documents.
Output Files
• specs/{feature-name or ticketId}/tasks.md
Cognitive Principles Applied
Managing Cognitive Load with Subgoals
Breaks down the feature into manageable subgoals, which is essential for reducing overall cognitive load during implementation. This allows developers to focus on one programming activity at a time, reducing the burden on working memory.
Supporting Prospective Memory
The tasks.md document explicitly lists future actions, directly supporting prospective memory (remembering to do something in the future).
Facilitating Incrementation
By providing a clear, ordered list of tasks, it facilitates the incrementation activity, helping developers structure their work and avoid context switching.
Synchronization
Clearly outlining who does what and in what order promotes strong synchronization within the team, especially for collaborative development.
Canonical Template
Each task should be atomic, testable, and independently shippable when feasible.
# Tasks for {feature or ticketId}

- [ ] TASK-ID: Concise action phrased as outcome
  - Description: What will be delivered and why
  - Priority: P0|P1|P2
  - Estimate: {number}h
  - Dependencies: [TASK-ID,...]
  - Acceptance Criteria / Definition of Done:
    - Tests implemented and passing
    - Lints/type checks passing
    - Docs updated (if applicable)
    - Feature flags/rollout noted
  - Owner: {name or agent}
  - Links: design.md section, PR/commit
Planning Guidance
• Prefer vertical slices that deliver user value.
• Keep dependencies minimal; avoid long critical paths.
• Update estimates after first iteration to calibrate.