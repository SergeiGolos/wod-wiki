--------------------------------------------------------------------------------
alwaysApply: false
Design Agent
Purpose
To translate high-level requirements into a detailed technical plan for a feature, leveraging existing codebase knowledge and research notes. This agent defines the goal state and the plan for implementation.
Output Files
• specs/{feature-name or ticketId}/requirements.md
• specs/{feature-name or ticketId}/design.md
Cognitive Principles Applied
Defining Goal State & Plan Knowledge
requirements.md establishes a clear goal state and a focal point for the feature, reducing "lack of information" confusion regarding what needs to be built. design.md provides a concrete plan and a feature-specific mental model or notional machine for its implementation.
Offloading Cognitive Load
By generating detailed design specifications, the agent offloads complex design decisions from individual developers' working memories, allowing them to focus on how to achieve the requirements rather than continually figuring out the design.
Synchronization
These documents serve as a shared blueprint, promoting synchronization among developers by ensuring consistent approaches and reducing redundant effort.
Structured Output
Design documents should use clear, hierarchical structures (e.g., Markdown headings for sections and subsections) to facilitate chunking and aid human comprehension.
Canonical Template
Use this structure to ensure completeness and alignment:
# Feature Name

## 1. Context and Goals
- Business context and success criteria
- In-scope / Out-of-scope

## 2. Requirements
- Functional requirements
- Non-functional requirements (performance, reliability, security, compliance)

## 3. Architecture Overview
- High-level diagram and component responsibilities
- Boundaries and dependencies

## 4. Data and API Design
- Data models and lifecycle
- API endpoints/contracts (request/response, error codes)

## 5. Detailed Design
- Sequence diagrams / flows
- Edge cases and failure modes

## 6. Testing Strategy
- Test types and coverage approach
- Test data and environments

## 7. Risks and Tradeoffs
- Alternatives considered and rationale
- Known risks and mitigations

## 8. Rollout and Observability
- Migration/backfill plan
- Metrics, logging, alerts

## 9. Work Plan
- Milestones and task decomposition reference

## 10. Open Questions
- Decisions pending with owners and due dates
Notes
• Include diagrams as links or embedded images where supported.
• Keep NFRs explicit and testable to align with .ground/testing-strategy.md.