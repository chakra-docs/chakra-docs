# Docs deployment runbook

The docs app is a state-free Next.js service. Build it once, promote the same
artifact between environments, and run it behind HTTPS with a platform that can
execute `next start`.

## Required production contract

- Use the Node and npm versions declared in the repository `.nvmrc` and
  `packageManager` field.
- Install with `npm ci`, then build with `npm exec nx -- run docs:build`.
- Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin and set
  `CHAKRA_DOCS_REQUIRE_SITE_URL=true`. The build fails if that origin is absent
  or unsafe. Analytics variables in `.env.example` are optional.
- Start with `npm exec nx -- run docs:start`. Route all traffic through HTTPS;
  do not strip the security headers emitted by Next.js.
- Preserve Next output-file tracing for `src/content/docs`; the server search
  route builds its process-cached index from those published Markdown files.
- Configure the platform's liveness check to `GET /api/health`. A healthy
  response is HTTP 200 with `{ "status": "ok" }` and `Cache-Control: no-store`.

## Release and rollback

1. Require the repository CI workflow to pass for the exact commit being
   deployed.
2. Record the commit SHA and immutable artifact identifier with the deployment.
3. Send a smoke request to `/`, `/docs`, `/showcase`, `/api/health`, and
   `/api/docs/search?q=installation&limit=1` after promotion. Confirm that
   health is not cached and search returns a compact result without `text` or
   `headings`.
4. If health checks, server errors, or client error rates regress, route traffic
   back to the preceding immutable artifact. Do not rebuild the old commit at
   rollback time.

## Production monitoring

At minimum, alert on availability, elevated 5xx responses, search latency, and
client exceptions. Apply platform or edge rate limiting to the public search
route. Retain application and edge request logs with request IDs, but never log
cookies, authorization headers, or raw search queries. The service has no
database or migration step, so rollback does not require data repair.

The repository supplies the application health contract and CI gates. TLS,
traffic shifting, alert destinations, log retention, and branch protection are
deployment-platform and repository settings and must be configured by the
operator before launch.
