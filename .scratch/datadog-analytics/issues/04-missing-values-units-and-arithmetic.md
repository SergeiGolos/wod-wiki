# Missing values, units, and numerical correctness

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 01, 02, 03
Prerequisites: [Field discovery, identity, and metadata provenance](01-field-discovery-and-identity.md); [Automatic grain selection and contribution ownership](02-automatic-grain-and-contributions.md); [Time buckets, group keys, and alignment boundaries](03-time-buckets-and-group-keys.md)

## Question

What arithmetic contract implements zero-filled graphs and most calculations without confusing absence, recorded zero, invalid data, or an undefined result?

Resolve:
- An explicit behavior matrix for sum, average, minimum, maximum, count, last, delta, ratios, and rolling calculations. Graphs zero-fill missing observations; averages exclude missing observations and include recorded zero. Determine remaining operation-specific exceptions with the user.
- Preserve presence through projection, aggregation, alignment, formulas, and display. Define how averages treat derived synthetic zeros, all-missing inputs, and whether count counts observations or synthesized buckets.
- Normalize compatible units before arithmetic even without an explicit display-unit directive (source section 3.3); define canonical, preferred, and explicit unit precedence, and dimensionless or unknown-unit handling.
- Reject affected calculations on incompatible field types/units. Define diagnostic granularity and propagation to dependent formulas while independent queries remain usable. Division by zero can yield an explained undefined result, distinct from ordinary missingness.
- Chronological last/delta semantics independent of input order, including equal-timestamp ties (source section 3.4).

Resolution must provide numerical examples and a complete validity/presence contract, not source-text assertions. Do not add skip-invalid-record syntax without a new user decision.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.
