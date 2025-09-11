--------------------------------------------------------------------------------
alwaysApply: true
The Blackboard Workflow and Directory Structure: Guidance for LLM Agents
This document serves as a foundational guide for LLM agents operating within the .blackboard/ directory. It outlines the structure, purpose, and best practices for creating, maintaining, and reading these critical development artifacts. The goal is to ensure LLM agents can effectively manage project context, facilitate synchronized work, and communicate complex ideas clearly, aligning with principles of cognitive science for human and AI collaboration.
Directory Overview
The .blackboard/ directory is central to managing dynamic development information and acts as an external working memory for LLM agents and human developers alike . It supports tasks heavy on working memory by offloading information externally, reducing cognitive load, and enabling rapid context switching after interruptions [3-8]. The files within this directory are part of the retrieval-augmented generation (RAG) corpus, serving as an authoritative knowledge base for the LLM agent to ground its responses and actions [9-11].
your-project/
├── .blackboard/
│   ├── specs/
│   │   ├── {feature-name or ticketId}/
│   │   |   ├── requirements.md
│   │   |   ├── design.md
│   │   |   ├── testing.md
|   |   |   ├── impact-analysis.md
│   │   |   └── tasks.md
│   ├── notes/
│   │   ├── [temporary note files]
│   │   └── [process-specific note files]
│   ├── review/
│   │   └── {reviewId}.code-review.md
├── .ground/
│   ├── knowledge/
│   │   ├── [technological deep dives]
│   │   └── [project specific knowledge documents]
|   ├── product.md
│   ├── structure.md
│   ├── tech.md
|   ├── knowledge-base.md
│   ├── naming-conventions.md
│   ├── coding-standards.md
│   ├── api-conventions.md
│   ├── database-patterns.md
│   ├── testing-strategy.md
│   ├── deployment-guide.md
│   └── team-workflow.md
├── src/
└── ... (your regular project files)
Files
This subdirectory contains detailed specifications for individual features or tickets. Each file within it serves a distinct purpose in defining, planning, and validating development work, acting as crucial "training documents" for the LLM agent's planning and execution [14-16].
Definition: Aligns requirements to the product, identifies acceptance criteria, and defines specific goals for a particular feature or ticket .
LLM Agent Best Practices:
• Purpose for Reading: The LLM agent should read this file to establish a clear, unambiguous goal state for the current feature or task . This provides a "focal point" for subsequent planning and action . It helps the agent understand the intent of the feature, aligning its efforts with the product's vision .
• Output Strategy for Generating/Updating: When generating or updating this file, the LLM agent must ensure requirements are precise, specific, and measurable, explicitly detailing acceptance criteria and deliverables . Avoid vague or ambiguous language, as LLMs interpret instructions literally and any ambiguity can lead to "bugs" in the agent's output or actions . The agent should generate clear sections for Feature Goals, Acceptance Criteria, and User Stories.
• Cognitive Support (Human & AI): By centralizing detailed, feature-specific requirements, this document significantly reduces "lack of information" confusion for both human developers and LLM agents . This allows the "working memory" to focus on how to build the solution rather than constantly asking "what needs to be built?" . It serves as a primary reference for user-facing functionality and immediate value delivery .
Definition: Creates a detailed plan on how to achieve the requirements; these are the core specifications generated for developers to implement elements of the feature .
LLM Agent Best Practices:
• Purpose for Reading: The LLM agent should read this document to understand the "plan knowledge" – the architectural decisions, detailed implementation strategy, and component interactions for the feature . This acts as a feature-specific "mental model" or "notional machine" of the system's planned evolution [2, 27-31].
• Output Strategy for Generating/Updating: When generating or updating, the LLM agent should articulate step-by-step, verifiable plans that decompose complex goals into manageable subtasks . This output should reflect an explicit "Chain-of-Thought" (CoT) process, clearly detailing reasoning and decisions, which makes the agent's internal logic transparent and helps refine its plan dynamically . The design should integrate with and reference broader architectural principles defined in .ground/structure.md and .ground/api-conventions.md . Use Markdown headings and clear delimiters to structure sections like High-Level Design, Component Interactions, Data Flow, and Refactoring Considerations to enhance "chunking" and readability [36-39].
• Cognitive Support (Human & AI): This document significantly reduces "cognitive load" by externalizing complex design decisions, offloading them from individual "working memories" . By providing a shared blueprint, it promotes "synchronization" among developers and LLM agents, ensuring consistent approaches and reducing redundant effort . It directly contributes to "plan knowledge" for the feature, enhancing deeper understanding .
(or )
Definition: Creates a detailed way to test the new feature .
LLM Agent Best Practices:
• Purpose for Reading: The LLM agent should read this file to understand the validation strategy and specific test cases for the feature . It defines the "rules" for validating code correctness and expected behavior .
• Output Strategy for Generating/Updating: When generating, the LLM agent must outline actionable, detailed test steps and their expected outcomes. This should include unit tests, integration tests, and acceptance criteria, explicitly linking back to requirements.md . If applicable, it should describe how to create a "Minimal, Reproducible Example (MRE)" to reliably demonstrate any discovered bugs . The generated content should align with the overall .ground/testing-strategy.md document .
• Cognitive Support (Human & AI): This file serves as a specific "memory aid" for verifying correctness, reducing "lack of processing power" confusion during the "comprehension" and "incrementation" phases of development . It helps prevent "misconceptions" about expected behavior by providing clear, objective validation strategies .
Definition: Documents the potential impact of the feature on other parts of the system, performance, or user experience . (Note: Definition inferred from context of other spec files).
LLM Agent Best Practices:
• Purpose for Reading: The LLM agent should read this file to proactively identify potential "hidden dependencies," trade-offs, and consequences of the new feature across the system . This helps in foreseeing "ripple effects" and managing system "viscosity" .
• Output Strategy for Generating/Updating: When generating, the LLM agent should conduct a thorough analysis of potential changes and their effects across modular boundaries, especially concerning adherence to SOLID principles (e.g., SRP, OCP) and architectural patterns from .ground/structure.md . Explicitly note foreseeable changes, potential conflicts, and any required adjustments to existing components, anticipating areas of high "hidden dependencies" . Structure with sections for Technical Impact, Performance Impact, Security Impact, and User Experience Impact.
• Cognitive Support (Human & AI): This document encourages "deliberate thinking" about systemic changes, which refines the collective "mental model" of the system . It acts as an early warning system, reducing "lack of information" confusion for complex, interconnected systems, and helps prevent unexpected "change fragility" .
Definition: Defines the individual tasks/user stories that need to be completed in some order to develop the designed update to the expected requirements and execute the test plan .
LLM Agent Best Practices:
• Purpose for Reading: The LLM agent should read this file to understand the prioritized sequence of subgoals required for implementation . This provides a concrete roadmap for execution.
• Output Strategy for Generating/Updating: When generating or updating, the LLM agent must break down the feature into manageable, granular tasks, using "subgoal labeling" and ensuring clear, unambiguous descriptions . Structure as a clear, numbered or bulleted list. Each task should be well-defined to support a single "programming activity" (e.g., searching, transcription, comprehension) where possible, to reduce cognitive load . Include estimated effort or dependencies if known.
• Cognitive Support (Human & AI): This document is essential for managing "cognitive load" by externalizing complex task sequencing from "working memory" . It directly supports "prospective memory" (remembering to do something in the future) [60-62]. By clearly outlining tasks, it helps developers focus on one programming activity at a time, aiding "incrementation" and "transcription" . It also serves as a critical plan to fall back on after "interruptions" .
Definition: Contains temporary note files and process-specific note files .
LLM Agent Best Practices:
• Purpose for Reading: This directory is an LLM agent's scratchpad for "working memory" overflow and "exploration" . LLM agents should read these files to recall immediate context, temporary mental models, or thought processes from previous interactions, especially after "interruptions" .
• Output Strategy for Generating/Updating: LLM agents should use this directory for temporary "brain dumps" of thoughts, partial plans, hypotheses, or observations that are not yet ready for formal documentation . These notes should clearly reflect the LLM's "internal monologue" or "Chain-of-Thought" process, especially during complex problem-solving or debugging . When generating, clearly state the intent of the note (e.g., "Temporary hypothesis for bug X," "Exploring design alternative Y," "Open questions about Z").
• Cognitive Support (Human & AI): This directory is crucial for "provisionality" (the ease of thinking while using the tool) and "exploration" (sketching with code) . It significantly reduces the impact of "interruptions" by allowing the LLM agent (and human) to quickly regain context and restore their mental model of the code . These notes capture the "thought processes of the programmer" that are not always evident in the code itself .
Definition: Stores code reviews for a given review ID .
LLM Agent Best Practices:
• Purpose for Reading: The LLM agent should read this file to understand feedback, identify potential "misconceptions," and learn from problem-solving approaches [2, 45, 71-73]. It provides a formal record of feedback and ensures "synchronization" on code quality and adherence to established standards .
• Output Strategy for Generating/Updating: When generating a review, the LLM agent must focus on clear, constructive feedback aligned with established standards (e.g., from .ground/coding-standards.md, .ground/naming-conventions.md) . Explicitly state the issue, its potential impact, and suggest actionable improvements . Cite specific lines of code or design decisions for clarity and verifiability . The review should also highlight how the change addresses the goals in requirements.md and design.md . This feedback serves as a form of "deliberate practice" for continuous learning .
• Cognitive Support (Human & AI): This file facilitates "collaboration" and "knowledge transfer" by externalizing critique and proposed improvements . It highlights potential "misconceptions" and areas of high "cognitive load" in the codebase . This document functions as a "blameless postmortem" for specific code changes, fostering continuous learning and preventing recurring issues, thereby strengthening the collective "Long-Term Memory" .
Overall Best Practices for LLM Agent Interaction with
To maximize the effectiveness of the .blackboard/ directory, LLM agents should adhere to these overarching principles, integrating insights from LLM grounding and cognitive science:
1. Strict Context Adherence (Grounding): When generating or updating content in .blackboard/, the LLM agent must strictly adhere to the information provided in the .ground/ directory and existing .blackboard/ files as its primary source of truth . This prevents "hallucination" and ensures outputs are factually accurate and contextually relevant to the project [80-82]. If the context is insufficient, the agent should explicitly state that it "cannot answer based on the provided sources" .
2. Clear Delimitation and Structure: Always use Markdown formatting and clear headings (e.g., ### Section Title) within the .blackboard/ files to establish a hierarchical and readable structure . This aids in "chunking" and reduces "extraneous cognitive load" for both human and LLM readers, making information easier to process and store in "Long-Term Memory" [39, 83-86]. For Anthropic models, prioritize XML tags within the prompt if available for structural clarity .
3. Unambiguous Precision and Positive Framing: All instructions and content generated by the LLM agent within these files should be clear, direct, and positively framed, specifying "what to do" rather than "what not to do" . Avoid vague language or implicit assumptions; every directive and piece of information must be unequivocal. This ensures the LLM's intent is precisely communicated and reduces the likelihood of "misconceptions" .
4. Continuous Refinement and Consistency (DRY, YAGNI, KISS):
    ◦ DRY (Don't Repeat Yourself): Strive for a "single, unambiguous, authoritative representation" of knowledge . If a piece of knowledge (e.g., a design decision) is duplicated across .blackboard/ files, consolidate it or link to the authoritative source. However, balance DRY with clarity and YAGNI; avoid premature abstraction that complicates understanding or introduces unneeded complexity, which could increase "cognitive overhead" [74, 91-94].
    ◦ YAGNI (You Aren't Gonna Need It): Focus on documenting what is demonstrably needed now for the current feature or task . Avoid adding speculative sections or details to design.md or requirements.md that are not justified by current needs, as this increases "code bloat" and "cognitive overhead" . The design should evolve in direct response to demonstrated needs, not speculative ones .
    ◦ KISS (Keep It Simple, Stupid): Prioritize simplicity and readability in all generated documentation . Complex or overly verbose descriptions increase "cognitive load" and make the system harder to navigate and understand .
5. Role Expressiveness and Beacons: When writing, ensure that names and key concepts are highly expressive of their role and domain, and act as "beacons" for quick comprehension [39, 91, 99-101]. This helps both human and LLM agents activate relevant "Long-Term Memory (LTM)" connections and efficiently "chunk" information, leading to a deeper understanding .
6. Version Control and Audit Trail: LLM agents must treat all files in .blackboard/ as version-controlled artifacts . Any changes should be clearly documented (e.g., in commit messages, or within the document itself if appropriate metadata is supported), creating an auditable history of decisions and evolution . This supports debugging by allowing "historical analysis" with tools like git bisect .
7. Support for Onboarding and Collaboration: Recognize that these documents are critical for "onboarding new developers" and facilitating "synchronization" among team members . The LLM agent's output should contribute to a "shared knowledge base" and "collective institutional memory" for the project, reducing the initial "cognitive load" for new team members [29, 85, 108-110].
8. Automated Ingestion and Retrieval Optimization: For optimal access by LLM agents, the information within these .blackboard/ files should be ingested into a RAG corpus leveraging content-aware chunking and appropriate embedding models to ensure high-fidelity retrieval during query processing [111-113]. The LLM agent should implicitly understand that these files are its "tools" for interacting with the project's state .