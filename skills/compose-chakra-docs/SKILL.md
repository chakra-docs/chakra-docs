---
name: compose-chakra-docs
description: Compose, integrate, theme, migrate, or troubleshoot documentation experiences built with the @chakra-docs packages and Chakra UI. Use when creating a new Chakra Docs instance, adding docs to an existing application, choosing framework/source/search packages, wiring routes and providers, composing docs UI primitives, configuring slot recipes, or reviewing an instance for accessibility and host-theme compatibility.
---

# Compose Chakra Docs

Build the docs section as a feature of the host application. Preserve the host's router, Chakra system, providers, header, authentication, analytics, and non-docs routes.

## Start with the host application

1. Inspect the package manager, framework/router, React and Chakra versions, existing Chakra system, route layout, content location, and installed `@chakra-docs/*` versions.
2. Read the installed package exports and types before generating code. Prefer those over examples in this skill when the installed version differs.
3. Identify whether the request is a new integration, a migration, a theme change, or a focused component composition. Do not replace unrelated application architecture.
4. Choose only the packages required for the requested features. See [frameworks and packages](references/frameworks-and-packages.md).

## Compose the instance

1. Keep filesystem or Git content discovery server-only. Build or cache one manifest and derive routing, navigation, headings, search, sitemap, feeds, and machine-readable routes from it.
2. Register `chakraDocsThemeConfig` in the host Chakra system, then layer application recipe overrides after it.
3. Wrap the docs subtree with `DocsProvider`; provide the router-native link component, labels, analytics, code highlighting adapter, and sticky offsets that the host needs.
4. Start with `DocsLayout`, `DocsArticle`, and the host's Markdown/MDX renderer. Add breadcrumbs, page actions, feedback, pagination, search, and richer content primitives only when useful.
5. Enable collapsible navigation explicitly. Keep the backward-compatible non-collapsible behavior unless the application asks for disclosure navigation.
6. Expose composition points instead of embedding application-specific behavior in package components. Let the host own persistence, navigation callbacks, and product-specific actions.

Read [composition patterns](references/composition-patterns.md) when building or revising page UI. Read [theming and recipes](references/theming-and-recipes.md) when changing appearance or diagnosing styles.

## Verify the result

- Exercise the actual docs route, including a nested page, client-side navigation, active sidebar/TOC state, sticky offsets, mobile TOC, keyboard use, and unsafe-link handling.
- Confirm the host theme supplies any custom semantic tokens used by overrides. Package defaults should remain portable `bg`, `fg`, and `border` values.
- Keep server-only source packages out of client bundles.
- Run the host application's typecheck, tests, lint, and production build in proportion to the change.
- When using local `yalc` packages, verify the consuming app resolves the intended build and refresh the package only when the user authorizes publishing.
