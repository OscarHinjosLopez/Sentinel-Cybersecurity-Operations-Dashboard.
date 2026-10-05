# Release validation — 1.0.0

Local release preparation on 5 October 2026. Node 24.21.0, npm 11, Windows and Chromium. This document distinguishes local execution from remote deployment/container checks.

## Production audit

| Area                     | Finding                                                                                                                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets                  | No real secrets found in repository source/configuration/documentation. Public demo passwords/tokens and Angular injection-token identifiers are intentional. npm audit reported zero vulnerabilities.                                                                  |
| Local paths              | No personal absolute paths in public repository documentation. Localhost addresses only describe development/audit tooling; the application API boundary is relative `/api`.                                                                                            |
| Debug code               | No stray console.log or blocking TODO/FIXME found. Logger output is gated to development; bootstrap error reporting is intentional. CLI scripts print operational results.                                                                                              |
| Artifacts                | Build, cache, coverage, Playwright and Lighthouse output stay ignored. Screenshots and the sanitized performance evidence are intentional publication assets. Existing working changes from prior sprints were preserved.                                               |
| Production configuration | Default production build, optimization, explicit sourceMap false, hashed output, initial 400/450 kB budgets, lazy routes and passing bundle architecture gate. No testing bridge/providers in production. No build-time secrets/environment substitutions are required. |
| EOL policy               | .gitattributes selects LF for text with binary exceptions; EditorConfig agrees. No repository-wide formatting/refactor of product code was performed.                                                                                                                   |

The audit is a source/configuration scan, not a penetration test or historical Git secret scan. `git status` remains dirty because release changes and prior sprint changes have not been committed; that is distinct from accidental generated artifacts.

## Checks

| Check                             | Local result                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| npm ci                            | PASS, clean reinstall from lockfile                                                                        |
| Format, lint, typecheck           | PASS, standalone checks and complete quality gate                                                          |
| Unit/integration                  | 383 passing tests, 45 files                                                                                |
| Coverage                          | PASS, all configured thresholds met                                                                        |
| Production build                  | PASS, bundle gate included                                                                                 |
| E2E                               | 47 passing Chromium tests, including axe and 200/400% zoom                                                 |
| Quality                           | PASS                                                                                                       |
| Production smoke                  | PASS: real demo login, dashboard, deep-route reload, SPA fallback and missing asset 404; no browser errors |
| README links and image dimensions | PASS, 35 relative links and eight 1440×900 images                                                          |
| git diff --check                  | PASS                                                                                                       |
| Docker                            | NOT RUN: Docker executable not installed; CI build/smoke configured                                        |
| Vercel / GitHub Actions           | NOT RUN remotely: no connected authenticated deployment or remote workflow execution performed             |

The sandbox initially denied Angular/esbuild access to parent directories. Build/tests were run with the required execution permission; this was an environment restriction, not a product failure. npm dependency audit required registry access and completed without dependency changes or audit fix.

## Verified metrics

| Metric           | Final local result             |
| ---------------- | ------------------------------ |
| Lines            | 89.06% (1612/1810)             |
| Statements       | 86.05% (2036/2366)             |
| Functions        | 86.79% (460/530)               |
| Branches         | 86.76% (1422/1639)             |
| Initial bundle   | 355.71 kB raw / 113.26 kB gzip |
| Unit/integration | 383                            |
| E2E              | 47                             |

The actual coverage rerun is slightly below the supplied Sprint 9 reference (89.11 / 86.13 / 86.98 / 86.82), without changing product code or exclusion rules. The rerun values are published rather than assuming identical execution coverage.

Lighthouse scores are existing verified Sprint 9 laboratory evidence, not a fresh release measurement: both Login and authenticated Dashboard have after medians of 100 Performance, 100 Accessibility and 100 Best Practices. Initial bundle improvement is 497.63 → 355.71 kB (−28.5%); Dashboard LCP is 889 → 681 ms (−23.4%). See [protocol](performance.md) and [raw results](performance-results.json).

## Release boundaries

Version 1.0.0 is prepared in package.json and lockfile, with MIT license and CHANGELOG. No product features, backend, SSR, PWA, real auth/socket or external observability were added. No commit, tag, push, remote metadata edit or deployment publication was performed.

Docker image size/build/run and hosted Vercel headers/fallback remain unverified locally. CI includes container validation; verify the platform once connected. Human assistive-technology testing remains a documented accessibility limitation. The configured origin URL ends in Dashboard..git: confirm the intended repository before remote publication. [External publication steps](repository-metadata.md) describe the remaining actions requiring access.
