---
state: open
labels: [wayfinder:task]
title: "Find-target validation (C7)"
blocked-by: ["004-discriminated-query-union-c5"]
---

## Question

Land C7 on the branch: `find:`/`rows:` targets validate at parse against
`WQL_FIND_TARGETS` (`vocabulary.ts:85`) widened to the result planes per the
rows model — unknown target becomes an error-as-value listing valid targets
(today any Word parses and silently returns empty at runtime). Closed enum;
composer target picker reads the same vocabulary (verify).

Per asset 003, C7's targets are now promoted columns, which it validates
against naturally.
