# ADR: Playground Route Governance

- **Status:** Accepted
- **Date:** 2026-05-20
- **Authors:** CTO audit from [WOD-490](/WOD/issues/WOD-490)
- **Implementation follow-up:** [WOD-502](/WOD/issues/WOD-502), [WOD-503](/WOD/issues/WOD-503), [WOD-504](/WOD/issues/WOD-504), [WOD-505](/WOD/issues/WOD-505), [WOD-506](/WOD/issues/WOD-506), [WOD-507](/WOD/issues/WOD-507), [WOD-508](/WOD/issues/WOD-508)

## Context

The playground router grew into a mixed surface:

- user workspace routes (`/playground`, `/journal`)
- library/content routes (`/collections`, `/feeds`, generated docs pages)
- runtime lifecycle routes (`/tracker/:runtimeId`, `/review/:runtimeId`)
- compatibility aliases (`/note/:category/:name`)
- a wildcard fallback that also resolves real generated pages

That makes the route interface shallow: callers cannot infer ownership cleanly from the first segment, and related route families are split across multiple namespaces.

## Decision

### 1. Use a resource-first route model

Future canonical routes should cluster by product concept:

- personal workspace
- library/content
- execution lifecycle
- compatibility redirects

### 2. Keep readable browse/index namespaces

Readable product nouns should remain canonical for browse/index surfaces:

- `/playground`
- `/journal`
- `/collections`
- `/feeds`
- a dedicated docs namespace

### 3. Normalize related families under shared namespaces

The approved target shape is:

- planning under `/journal/plan`
- collection workouts under `/collections/:collection/:workout`
- docs under `/guide/*`
- runtime execution under `/run/:runtimeId`

### 4. Compatibility paths should redirect, not compete

Legacy paths should remain only as compatibility affordances:

- `/note/playground/:id`
- `/workout/:category/:name`
- `/getting-started`
- `/syntax/*`
- `/tracker/:runtimeId`

### 5. If detail routes are shortened later, do it narrowly

Board feedback preferred shorter direct note/detail routes, but not a cryptic one-letter route tree everywhere.

Applied rule:

- if we shorten anything later, shorten only high-frequency direct note/detail entry
- do **not** replace the readable browse/index namespaces with one-letter canonical paths

Examples of the kind of shortening that was considered acceptable in planning:

- playground note detail → short form
- journal day detail → short form

But these are a **future route-design choice**, not part of the current shipped contract on `dev`.

## Consequences

### Positive

- route ownership becomes easier to reason about
- related route families stop leaking product history into the public URL contract
- redirects become intentional compatibility seams instead of undocumented behavior
- future docs can distinguish current contract from migration targets

### Negative

- migration requires a redirect matrix
- collection workout migration needs explicit handling for non-collection categories
- wildcard removal requires an explicit not-found experience and generated route registration strategy

## Validation path

- route builders and docs should converge on the same canonical families
- compatibility paths should be documented as redirects/aliases, not equal canonical routes
- route additions should choose the owning namespace first, then the path shape
- any future short detail-route decision must preserve readable browse/index namespaces
