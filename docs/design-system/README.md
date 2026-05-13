# Design System

This directory contains the WOD Wiki design system documentation, including layouts, templates, and components.

## Status Key

Every doc in this system carries a **Status** tag:

| Status | Meaning |
|---|---|
| **Implemented** | Component/route exists in production code and matches this spec |
| **Design Draft** | Spec written; component not yet built (or existing component diverges from spec) |
| **Planned** | Route/feature scoped but no spec or implementation yet |
| **Deprecated** | Component exists but should not be used in new code |

All **Design Draft** docs link to [WOD-261](/WOD/issues/WOD-261) — the implementation tracking issue.

### AppTemplate vs SidebarLayout

`AppTemplate` ([app-template.md](./00.layout-template/app-template.md)) is the **Design Draft** spec for the target 3-panel layout.  
`SidebarLayout` (`src/components/playground/sidebar-layout.tsx`) is the **currently shipped** 2-panel layout.

Until [WOD-261](/WOD/issues/WOD-261) is resolved, `SidebarLayout` is the implementation reference for the web app shell. Do not build new page shells against the `AppTemplate` spec without confirming which layout is active.

## Overview
- [Design System Overview](./Overview.md)
- [Layout Template](./00.layout-template/)
- [Page Templates](./01.page-templates/)
- [Page Routes](./02.page-routes/)

## Guides
- [Color Remediation Plan](../audits/color-remediation-plan.md)
- [Atomic Design Audit](../audits/atomic-design-audit.md)
