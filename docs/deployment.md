# Deployment

## Vercel

Deployment configuration is included. Publish URL pending. No deployment was published from this environment and no Vercel project/authentication is configured in the repository.

1. Push the reviewed repository to GitHub and run GitHub Actions.
2. In an authenticated Vercel account, import that repository with root directory `.` and Angular framework preset.
3. Select Node 24.x (the local/CI patch is pinned in `.nvmrc`). `vercel.json` defines `npm ci`, `npm run build` and `dist/sentinel/browser` output. No environment variables or secrets are required for this demo.
4. Let the Vercel Git integration manage previews and production deployment. Confirm the intended production branch in the project settings; GitHub Actions does not deploy.
5. Check login, dashboard and direct refresh on `/threats/THR-00042`, `/devices/DEV-00142` and `/settings`. Check a missing `.js` returns 404 and inspect cache/security headers.
6. Record the real published URL in README only after confirming it works.

Advanced routes apply security headers, serve existing files first, return 404 for missing assets, and fall back to `index.html` for SPA paths. Hashed JS/CSS gets one-year immutable caching; HTML revalidates. Public nonhashed assets use platform defaults. Configuration follows the [Vercel file configuration reference](https://vercel.com/docs/project-configuration/vercel-json). Hosted routing/headers still need validation on the actual platform.

## Docker/nginx

```bash
docker build -t sentinel .
docker run --rm -p 8080:80 sentinel
```

Visit `http://localhost:8080`. Node 24.21.0 Alpine runs `npm ci` and the production bundle gate in the build stage. nginx 1.28.0 Alpine contains only the static browser output and server configuration, without build node_modules, source, coverage or screenshots. The base images use fixed version tags; digest pinning can be added after registry validation. Image size and container behavior cannot be claimed until built.

`nginx.conf` uses [nginx try_files](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files) to serve routes through HTML, returns 404 for missing static assets, and enables gzip. Only hashed JS/CSS is immutable; HTML uses no-cache and nonhashed assets cache for one hour. All locations send nosniff, Referrer-Policy and Permissions-Policy. No untested CSP is imposed.

Docker is not installed in the release preparation environment. The CI Docker job builds the image and verifies fallback, asset errors and headers on an Ubuntu runner; its remote execution is pending.

## Production preview and captures

```bash
npm ci
npm run build
npm run preview:production
# Separate terminal, first browser installation only:
npx playwright install chromium
```

The preview uses `http://127.0.0.1:4400`, gzip, no-store and SPA fallback. It is a local validation server, not the deployment server. Localhost URLs belong only to development/audit tooling; the application uses relative domain-independent paths.

With the preview stopped, `npm run release:capture` starts its own production preview on port 4401, signs in normally, verifies login/dashboard and deep-route reloads, and captures eight 1440×900 images. Browser time is frozen for consistent normal mock data. It does not use testing providers or the E2E bridge. Results are stored in `docs/production-smoke.json`.
