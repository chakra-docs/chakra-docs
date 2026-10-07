# Docs deployment runbook

The docs app is a state-free Next.js service. Build it once, promote the same
artifact between environments, and run it behind HTTPS with a platform that can
execute `next start`.

## Required production contract

- Use the Node and pnpm versions declared in the repository `.nvmrc` and
  `packageManager` field.
- Enable Corepack, install with `pnpm install --frozen-lockfile`, then build
  with `pnpm nx run docs:build`.
- Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin and set
  `CHAKRA_DOCS_REQUIRE_SITE_URL=true`. The build fails if that origin is absent
  or unsafe. Analytics variables in `.env.example` are optional.
- Start with `pnpm nx run docs:start`. Route all traffic through HTTPS;
  do not strip the security headers emitted by Next.js.
- Preserve Next output-file tracing for `src/content/docs`; the server search
  route builds its process-cached index from those published Markdown files.
- Configure the platform's liveness check to `GET /api/health`. A healthy
  response is HTTP 200 with `{ "status": "ok" }` and `Cache-Control: no-store`.

## Shared site design and typography

The site uses the same neutral Chakra theme and docs-first layout as
react-fathom: Suisse Intl and Suisse Intl Mono, system light/dark mode,
native documentation components, a credit/license footer, and the COMMUNE
sub-footer. All site styling lives in `src/theme`; there are no site CSS files.

The shared OSS Fontstack kit is loaded from `_document.tsx`, so its stylesheet
stays in the document head during client-side navigation. The default kit is
`https://kits.fontstack.com/kit/o0v0t0oi.css`. Ensure the kit allows the production
domain and `chakra-docs.test`. Set `NEXT_PUBLIC_FONTSTACK_KIT_URL` before building
to use another Fontstack kit, or set it to an empty string to use system fonts.
The CSP allows Fontstack styles and fonts, but not arbitrary stylesheet hosts.

## Open Graph image capture

`/og-image` matches the react-fathom capture page: a fixed 1200 × 630 canvas,
Suisse typography, black/white colors, and COMMUNE credit. It bypasses site
navigation, footers, analytics, and color-mode controls. Review locally at
`https://chakra-docs.test/og-image`.

Page-specific templates follow the same convention as ryanhefner.com:

```text
/social-image                         -> /og-image
/docs/installation/social-image       -> /og-image/docs/installation
/docs/components/social-image         -> /og-image/docs/components
```

These are internal Next rewrites; the visible URL is retained. Captures use
the matching page's title and description by default. The welcome, showcase,
and OSS pages are supported too; unknown pages return 404.

Public pages include canonical, Open Graph, and Twitter metadata using
`NEXT_PUBLIC_SITE_URL`. Their default social artwork is the real 1200 × 630 PNG
served at `/api/social-image`. This fixed, cacheable card uses Next's bundled
font and needs neither a Fontstack request nor an external renderer. The page
titles and descriptions remain specific to each page.

`/sitemap.xml` lists the public site pages and published documentation; draft,
hidden, error, and capture pages are excluded. `/robots.txt` advertises the
sitemap and keeps the PNG endpoint accessible to social crawlers. CI builds
and browser tests use the production origin. Run the same checks locally with:

```sh
NEXT_PUBLIC_SITE_URL=https://chakra-docs.dev CHAKRA_DOCS_REQUIRE_SITE_URL=true pnpm nx run docs:e2e
```

The HTML capture pages above remain available for custom Suisse artwork. An
external OpenGraphs integration can capture the extensionless
`/<page>/social-image` page and host its PNG separately. No renderer is assumed
to exist, and Next deliberately does not rewrite `.png` requests to HTML.

Optional `title` and `description` query parameters customize the copy:

```text
/og-image?title=Composable%20documentation&description=Your%20content%2C%20your%20theme%2C%20your%20routing.
```

Blank values use defaults; whitespace is normalized and copy is limited to
100/200 Unicode code points with visual line clamping. React renders values as
text, never HTML. The default canvas is prerendered; query overrides require
JavaScript. Wait for `[data-og-ready="true"]` before taking a screenshot so the
current copy, fonts, and wordmark have settled.

For OpenGraphs, use the publicly deployed capture URL and a 1200 × 630
viewport. Local `.test` domains are not reachable by hosted capture services.
The Fontstack kit must allow the capture hostname. The route is marked
`noindex, nofollow` (also via `X-Robots-Tag` headers) and is not included in documentation navigation or manifest
sitemap records. Use the generated PNG/JPEG or hosted image URL for `og:image`
and `twitter:image` metadata, **not** the HTML capture URL.

## React Fathom analytics

The site uses public `react-fathom@0.2.0` and a site-local Pages Router tracker for initial and
client-side pageviews, plus documentation interaction events. Set
`NEXT_PUBLIC_FATHOM_SITE_ID` and optionally
`NEXT_PUBLIC_FATHOM_CUSTOM_DOMAIN` before building. No ID means no analytics
script or pageviews. Query strings, fragments, clipboard contents, search text,
and feedback comments are not sent; social-image capture pages bypass analytics.

The temporary tracker imports `useFathom` from the same root entry point as
`FathomProvider`, and imports Next's router directly. It avoids the separate
context bundled into the public 0.2.0 Next adapter. Once the corrected React
Fathom release is public, update the immutable dependency pin and restore its
Pages Router adapter, retaining URL filtering and the navigation regression
tests. No local yalc packages are required. React Fathom is a site dependency
only, not a published Chakra Docs package dependency.

## Release and rollback

1. Require the repository CI workflow to pass for the exact commit being
   deployed.
2. Record the commit SHA and immutable artifact identifier with the deployment.
3. Send a smoke request to `/`, `/docs`, `/showcase`, `/withoss`, `/api/health`, and
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
