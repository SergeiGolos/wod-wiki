alwaysApply: true
Shared Knowledge Library: When To Read Which Document
This guide helps an LLM decide which document in .ground/ to read based on the current task and context. If a section below matches the need, read the referenced document in full before proceeding and apply its guidance.
How to Use
• Scan the task, recent discussion, filenames, and snippets in the context window for the signals and keywords listed below.
• If you find a match, read the corresponding file from .ground/ completely before planning, coding, or reviewing.
• When citing guidance or making decisions, reference the document you read by its path.
--------------------------------------------------------------------------------
UX/UI Best Practices
• File: .ground/UX_UI Best Practices.md
• Purpose: Human-centered UX/UI, inclusive design, WCAG 2.2 accessibility, and ethical design patterns.
• Use when: Designing flows, improving usability/a11y, writing microcopy, assessing dark patterns, or planning design reviews.
• Signals/keywords: UX, UI, empathy, design thinking, accessibility, WCAG 2.2, contrast, keyboard, error states, inclusive design, dark patterns, ethics.
• Action: If any of the signals apply, read .ground/UX_UI Best Practices.md.

Language-Agnostic Code Review Best Practices
• File: .ground/Code Review Best Practices.md
• Purpose: Strategic, constructive code reviews that improve code health, security, knowledge sharing, and team resilience.
• Use when: Reviewing PRs, preparing for review, defining review standards, or choosing review modes (pair, async, etc.).
• Signals/keywords: code review, PR, diff, standards, nit, blocking, security review, tests, maintainability, knowledge sharing, Fagan, pair.
• Action: If any of the signals apply, read .ground/Code Review Best Practices.md.

Technical Writing & Markdown
• File: .ground/Markdown Best Practices.md
• Purpose: Docs-as-code, structure, clarity, accessibility, and publishing automation for technical docs.
• Use when: Writing READMEs, guides, SRS/ADR/RFCs, release notes, or setting up docs pipelines.
• Signals/keywords: documentation, Markdown, style guide, headings, diagrams, CI/CD docs, accessibility, structure, navigation.
• Action: If any of the signals apply, read .ground/Markdown Best Practices.md.

Requirements Engineering
• File: .ground/Requirements Best Practices.md
• Purpose: Elicitation, analysis, SRS specification, verification/validation, and traceability of requirements.
• Use when: Drafting or refining requirements, defining acceptance criteria, or setting up V&V for scope.
• Signals/keywords: functional, non-functional, SRS, elicitation, MoSCoW, V&V, acceptance criteria, traceability, feasibility.
• Action: If any of the signals apply, read .ground/Requirements Best Practices.md.

Planning & Decomposition
• File: .ground/Planning Best Practices.md
• Purpose: Work decomposition via WBS (predictive) and Agile hierarchy (initiatives→epics→stories), story mapping, and prioritization.
• Use when: Breaking down scope, designing backlogs, estimating/splitting stories, or aligning predictive and agile plans.
• Signals/keywords: WBS, work package, 100% rule, epics, features, stories, INVEST, story mapping, MoSCoW, estimation.
• Action: If any of the signals apply, read .ground/Planning Best Practices.md.

Agentic Systems & Grounding
• File: .ground/Agent Training Best Practices.md
• Purpose: Architecting LLM agents (system prompts, tools/ACI, planning/reasoning, memory) and safety guardrails.
• Use when: Designing an agent, defining tool schemas, planning memory, reflection/critique loops, or safety rules.
• Signals/keywords: agent, system prompt, tools, ACI, ReAct, CoT, memory, reflection, safety, guardrails.
• Action: If any of the signals apply, read .ground/Agent Training Best Practices.md.

• File: .ground/Grounding Best Preactices.md
• Purpose: Grounding via RAG—ingestion, chunking, embeddings, retrieval, reranking, citation, evaluation—to mitigate hallucination and staleness.
• Use when: Designing or tuning RAG pipelines, deciding chunking/embeddings, adding citations, or running evals.
• Signals/keywords: grounding, RAG, vector store, embeddings, chunking, retriever, reranker, citations, eval, hallucination, freshness.
• Action: If any of the signals apply, read .ground/Grounding Best Preactices.md.

Front-End Frameworks & Performance
• File: .ground/Mastering Qwik Serialization and App Development.md
• Purpose: Qwik resumability, optimizer ($/QRL), lazy-loading, and performance/SEO implications vs hydration frameworks.
• Use when: Building or optimizing Qwik apps, analyzing hydration vs resumability, or debugging serialization boundaries.
• Signals/keywords: Qwik, resumability, hydration, optimizer, QRL, component$, onClick$, TTI, SEO.
• Action: If any of the signals apply, read .ground/Mastering Qwik Serialization and App Development.md.

Testing: Playwright & Storybook 9
• File: .ground/Playwright Best Practices.md
• Purpose: Architecting a robust testing pipeline using Storybook 9 “Test” with Vitest (browser mode) + Playwright; migration from test-runner.
• Use when: Adding interaction/a11y/visual tests to Storybook, choosing addon-vitest vs test-runner, or migrating to SB 9.
• Signals/keywords: Storybook 9, addon-vitest, Vitest browser mode, Playwright, play function, a11y, visual testing, CI.
• Action: If any of the signals apply, read .ground/Playwright Best Practices.md.

• File: .ground/Playwright Study Guide.md
• Purpose: End-to-end fundamentals, tooling, patterns, and Playwright vs Selenium/Cypress comparisons.
• Use when: Learning/teaching Playwright, setting up projects, parallelism/trace/codegen usage, or cross-browser testing.
• Signals/keywords: E2E, WebSocket protocol, auto-waiting, trace viewer, codegen, fixtures, parallel, multi-tab/origin.
• Action: If any of the signals apply, read .ground/Playwright Study Guide.md.

SOLID — Overview & Principles
• File: .ground/SOLID Benefits.md
• Purpose: Why SOLID matters; combating software rot (rigidity, fragility, immobility, viscosity) and improving modularity/testability.
• Use when: Orienting teams to SOLID, motivating refactors, or aligning on design vocabulary and goals.
• Signals/keywords: SOLID, rot, cohesion, coupling, maintainability, clean architecture, design principles.
• Action: If any of the signals apply, read .ground/SOLID Benefits.md.

• File: .ground/SOLID Single Responsibility.md
• Purpose: Actor-centric SRP—one module, one actor; separation of concerns; cohesion and testability.
• Use when: Splitting large classes/modules, reducing cognitive load, decreasing merge conflicts, or improving tests.
• Signals/keywords: SRP, actor, cohesion, separation of concerns, refactor, unit tests.
• Action: If any of the signals apply, read .ground/SOLID Single Responsibility.md.

• File: .ground/SOLID Open Principle.md
• Purpose: OCP via abstractions and polymorphism; plugin/extensibility without modifying stable code.
• Use when: Adding new behaviors, designing extension points, or isolating core policy from changing details.
• Signals/keywords: OCP, abstraction, interface, plugin, extension point, strategy, template, decorator.
• Action: If any of the signals apply, read .ground/SOLID Open Principle.md.

• File: .ground/SOLID Liskov Substitution.md
• Purpose: Behavioral subtyping rules (pre/post/invariants/history/variance) ensuring safe substitution.
• Use when: Designing/validating inheritance/interfaces, spotting smells (Rectangle/Square, UnsupportedOperation), or refactoring.
• Signals/keywords: LSP, substitution, preconditions, postconditions, invariants, variance, contract.
• Action: If any of the signals apply, read .ground/SOLID Liskov Substitution.md.

• File: .ground/SOLID Interface Principle.md
• Purpose: Client-specific “role interfaces”; avoiding fat interfaces and ripple coupling (Xerox case study).
• Use when: Splitting interfaces, reducing compile-time coupling/redeploys, or API surface minimization.
• Signals/keywords: ISP, role interface, segregation, fat interface, client-centric, backpressure, interface pollution.
• Action: If any of the signals apply, read .ground/SOLID Interface Principle.md.

• File: .ground/SOLID Dependency Inversion.md
• Purpose: DIP (policy vs detail), inversion of interface ownership, and distinctions vs DI/IoC.
• Use when: Layering apps, decoupling business logic from frameworks/DBs, or enabling testing via abstractions.
• Signals/keywords: DIP, abstractions, high-level modules, adapters, interface ownership, DI container, ports/adapters.
• Action: If any of the signals apply, read .ground/SOLID Dependency Inversion.md.
--------------------------------------------------------------------------------
Decision Procedure (Quick Checklist)
1. Identify the task type (requirements/planning, UX/UI, docs, code-review, testing, agent/RAG, framework, design/principles).
2. Match signals/keywords from the context window to the sections above.
3. When a section matches, read the linked .ground/ document in full before proceeding.
4. Apply the guidance while planning and implementing; cite the document where relevant.