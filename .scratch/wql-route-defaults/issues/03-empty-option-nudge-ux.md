# Empty-option nudge UX

Type: prototype
Blocked by: 01

## Question

When a configured option has no value, what exactly does the user see and what runs? Charting settled the boundary: the nudge never blocks execution (the original "force user select" intent, softened).

- On a stream route landing with an empty-valued configured option: does an empty pill render in `StreamQueryBar`'s chip row, does the composer pill highlight, or does a subtle inline prompt appear? Prototype the candidate(s).
- What query runs while unpicked: the default query minus that clause (confirmed direction), and the nudge clears the moment a value is chosen.
- Can the user dismiss the nudge for the session, or does it persist until a value is picked?
- Does "empty" also apply to the source dropdown (no source selected → no `source:` clause) and Group-By (falls back to the existing effort/date precedence chain)?
