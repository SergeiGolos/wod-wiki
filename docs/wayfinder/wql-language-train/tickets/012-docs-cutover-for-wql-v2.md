---
state: open
labels: [wayfinder:task]
title: "Docs cutover for WQL v2"
blocked-by: ["010-release-the-language-train"]
---

## Question

Bring user/contributor docs to the shipped surface:

1. `docs/09-wql-deep-dive.md`: head rule (`rows:` primary, `find:` deprecated
   alias), window clauses on every family, `in` = units + `source:` filters,
   grain tags `summary|event` with `rollup` retired, error-as-value catalog.
2. Prototype doc marked implemented (status header), spec v2 confirmed
   accurate against what shipped.
3. Composer/cookbook references elsewhere in `docs/` swept for the old
   syntax examples.
