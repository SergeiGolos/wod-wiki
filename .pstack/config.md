# pstack role and model configuration
# Values are concrete provider/model-id choices confirmed by the host.
feature, refactoring: local/glm/glm-5.3-flash
bug-fix: local/ag/gemini-3.8-flash-high
perf-issue: local/ag/gemini-3.8-flash-high
hillclimb: local/glm/glm-5.3-flash
judgment and prose: local/ag/gemini-3.8-flash-high
hardest tasks: inherit-parent
how explorer: local/glm/glm-5.3-flash
how explainer: local/glm/glm-5.3
how critics: local/ag/gemini-3.8-flash-high, local/glm/glm-5.3, local/glm/glm-5.3, inherit-parent
why investigators: local/glm/glm-5.3-flash
why synthesizer: local/glm/glm-5.3
reflect tooling: local/glm/glm-5.3-flash
reflect judgment: local/ag/gemini-3.8-flash-high
reflect divergent: local/glm/glm-5.3
reflect synthesizer: local/glm/glm-5.3
arena runners: local/glm/glm-5.3, local/glm/glm-5.3, local/glm/glm-5.3-flash, inherit-parent
arena cross-judge pool: local/ag/gemini-3.8-flash-high, local/glm/glm-5.3, local/glm/glm-5.3, inherit-parent
swarm workers: local/glm/glm-5.3-flash
architect runners: local/glm/glm-5.3, local/glm/glm-5.3, local/ag/gemini-3.8-flash-high, inherit-parent
interrogate reviewers: local/ag/gemini-3.8-flash-high, local/glm/glm-5.3, local/glm/glm-5.3, inherit-parent
