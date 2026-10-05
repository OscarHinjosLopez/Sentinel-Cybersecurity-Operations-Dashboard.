# Sentinel — portfolio case study

## The project

Sentinel is my personal Angular portfolio project: a simulated Security Operations Center where users monitor threats, investigate incidents and inspect endpoint security posture. It demonstrates frontend engineering with fictional data rather than a commercial security product.

## The challenge

Build a coherent SOC interface with modern Angular architecture, realtime projections, advanced data tables and measurable quality. The challenge was keeping role-dependent actions, asynchronous state and navigation predictable while presenting dense information accessibly.

## My role

Frontend engineering end-to-end: architecture, UI composition, state/data access, mock integrations, automated testing, performance/accessibility review and release preparation. This was personal portfolio work, not employment at a security company.

## Technical challenges

### URL-driven data tables

Threat and device filters, sorting and pagination are synchronized with validated URL queries. Links, reload and browser history restore the query, while realtime refreshes preserve filters and correct invalid page bounds.

### RBAC

Explicit role permissions govern routes, navigation, command execution and mutation controls. Tests cover Admin, Analyst and Viewer. Frontend permissions make the demo consistent; real authorization must be enforced by a backend.

### Realtime

A transport abstraction separates simulated connections from event validation and projections. Bounded deduplication, ordering and reconnect backoff prevent repeated or obsolete events from corrupting local state. The mock does not provide durable event replay.

### Performance

Deferring modular SVG ECharts removed the chart engine from the initial route dependency. Feature/dialog lazy loading, stable chart instances and bounded history preserve responsive updates without changing the product scope.

### Accessibility

Keyboard paths, route focus, overlay focus restoration, reduced motion, semantic states and actual 200/400% browser zoom were tested alongside axe. The project is designed and tested against WCAG 2.2 AA criteria; it is not a certification or a substitute for assistive-technology user testing.

### Testing

Vitest unit/integration tests exercise business rules and Angular services; Playwright covers critical flows across roles, keyboard, theme, preferences and events. Production bundle checks reject accidental testing code, and a separate production smoke validates real demo login and deep-route reloads.

## Results

- Initial bundle: 497.63 → 355.71 kB, **−28.5%**.
- Dashboard LCP: 889 → 681 ms, **−23.4%**.
- **383 unit/integration tests**, **47 E2E tests**.
- **89.06% line coverage** in the release rerun (statements 86.05%, functions 86.79%, branches 86.76%). The Sprint 9 reference was 89.11% line coverage, 86.13% statements, 86.98% functions and 86.82% branches.

Performance figures are local desktop laboratory measurements from Sprint 9, not real-user monitoring. [Measurement protocol and evidence](performance.md) record methodology; [release validation](release-validation.md) records the final rerun and practical limits.

## What I would do with a real backend

Add typed REST API adapters, a real JWT/session strategy agreed with the service, server-side authorization, a persistent database, WebSocket event replay/resynchronization and observability. Those changes require backend contracts and operational security work; they are intentionally outside this frontend release.

## Presentation

The [README](../README.md) provides demo credentials and key screenshots. The [architecture](architecture.md) and [technical decisions](decisions.md) explain the implementation. [Security](../SECURITY.md) makes the demo boundaries explicit.
