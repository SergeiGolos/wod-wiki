# Config schema and resolution semantics

Type: grilling

## Question

What exactly is a Route WQL Config, and how does it resolve against the in-code `StreamProfile` system default?

Sub-decisions to settle:

1. **Record shape**: one record per route id — default WQL string, source-option list, Group-By list. Which parts are optional, and does an absent/empty part fall back independently (per-field fallback) or does any user config replace the whole route default wholesale?
2. **Storage**: localStorage key convention — follow the `wodwiki.viewSettings.v1` + `/<route>` precedent with a new prefix? One key for all routes or per-route keys?
3. **Keying**: route ids for the nine stream routes (`/journal`, `/collections`, `/feeds`, `/feed`, `/library`, `/efforts`, `/results`, `/results/segments`) plus a palette id. Edge: the parametric `/results/:resultId` profile builds its default from the result id — does it get a configurable default (template with placeholder?), or stay factory-only?
4. **Landing semantics**: config seeds only a bare landing (no `?q=` in URL); an explicit `?q=` keeps winning over both config and system default. Confirm saved/bookmarked URLs are never rewritten by config changes.
5. **Option-list semantics**: does a user source-option list replace or extend `typeOptions`? Same for Group-By vs the hardcoded `date/week/month/year/discipline/tag/source` list. Can a user re-introduce a second source option on a scope-locked route like `/efforts` (whose single-entry `typeOptions` locks the route today)?
6. **Validation**: WQL text parsed with the real parser on save — block invalid saves with diagnostics, or warn and allow?
7. **Reset**: per-route "back to system default" = delete that route's user record; the UI shows the in-code default read-only underneath.
