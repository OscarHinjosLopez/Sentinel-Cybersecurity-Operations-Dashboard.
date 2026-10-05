# Repository and release metadata

Remote metadata has not been changed.

**Description:** Enterprise-style SOC dashboard built with Angular, Signals, RxJS and realtime event architecture.

**Topics:** `angular`, `typescript`, `rxjs`, `signals`, `cybersecurity`, `dashboard`, `frontend`, `playwright`, `websockets`, `accessibility`.

The `websockets` topic describes the transport architecture; events are simulated, with no real socket implementation.

**Social preview:** use [dashboard-dark.png](screenshots/dashboard-dark.png) as the existing clean dashboard asset; crop it in GitHub's preview uploader if needed. No new branding is necessary.

**License:** MIT. **Prepared version:** 1.0.0.

After review, commit the intended changes, push and confirm GitHub Actions. Publish through Vercel's Git integration, set the real website URL, and enable private vulnerability reporting before directing reporters there.

Suggested annotated tag (not created):

```bash
git tag -a v1.0.0 -m "Sentinel v1.0.0"
git push origin v1.0.0
```

Create a GitHub release from that tag using [CHANGELOG](../CHANGELOG.md). Only execute remote publication after authorization. Verify the configured origin before pushing: its current URL ends in Dashboard..git; no remote URL was silently changed.
