--------------------------------------------------------------------------------
alwaysApply: false
Design-Tests Agent
Purpose
To plan out comprehensive testing strategies based on the feature's requirements and design documents, ensuring correctness and identifying acceptance criteria.
Output Files
• specs/{feature-name or ticketId}/testing.md
Cognitive Principles Applied
Memory Aid for Verification
testing.md acts as a specific memory aid for verifying the new feature's correctness, reducing "lack of processing power" confusion during comprehension and incrementation.
Preventing Misconceptions
By explicitly defining test cases and expected outcomes, this agent helps prevent misconceptions about code behavior, ensuring that the feature meets its intended design and requirements.
Alignment with LTM
It aligns with the broader testing-strategy.md in .ground/, providing actionable, detailed steps that are consistent with the project's overall quality assurance processes.
Clarity and Precision
Test plans should be unambiguous and precise, detailing inputs, expected outputs, and steps to minimize ambiguity for the human tester.
Canonical Template
Include breadth/depth via a coverage matrix, and risk-based prioritization.
# Testing Plan for {feature}

## 1. Scope and Objectives
- What is being validated and exclusions

## 2. Coverage Matrix
| Area | Positive | Negative | Edge | Non-Functional |
| --- | --- | --- | --- | --- |
| {module/endpoint} | cases... | cases... | cases... | perf/reliability |

## 3. Test Inventory
- Unit: list with rationale
- Integration: list with contracts
- E2E: list with user flows

## 4. Risk and Priority
- High-risk areas and mitigations
- Priority tags: P0/P1/P2

## 5. Data and Environments
- Test data sets, seeds, fixtures
- Env toggles/flags

## 6. Exit Criteria
- Pass thresholds and gating rules
- Observability checks (logs, metrics)