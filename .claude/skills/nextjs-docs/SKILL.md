---
name: nextjs-docs
description: Look up the installed Next.js version's own docs before writing or changing any Next.js code (routing, metadata, config, next/image, next/font, route handlers, static export). Use whenever a task touches a Next.js API.
---

# Next.js docs for this version

This repo runs a recent Next.js 16 release with breaking changes your training data may not cover.
The docs for the exact installed version ship inside the package, so read them instead of relying on memory.

1. Check the version: `bun pm ls next`.
2. Find the guide in `node_modules/next/dist/docs/`:
   - `01-app/02-guides/` for how-tos, such as `static-exports.md`.
   - `01-app/03-api-reference/` for APIs and `next.config` options.
3. Search by keyword when unsure, for example `grep -ril "generateMetadata" node_modules/next/dist/docs/01-app`.
4. Heed deprecation notices in the docs and in `bun run build` output.

## Constraints specific to this site

- `output: "export"`: nothing may need a server at runtime.
  That rules out API routes, middleware, ISR, `cookies()`, `headers()` and the image optimizer.
- Metadata route handlers such as `sitemap.ts` and `robots.ts` must export `dynamic = "force-static"`.
- `agentRules: false` in `next.config.ts` stops `next dev` from writing `AGENTS.md`; keep it.
