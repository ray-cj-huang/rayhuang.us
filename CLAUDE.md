@AGENTS.md

# rayhuang.us

Personal site for Ray Huang. Static Next.js export hosted on GitHub Pages at https://rayhuang.us.

## Commands

Use **Bun** for everything — never npm/yarn/pnpm, and never commit a `package-lock.json`.

```bash
bun install          # deps (bun.lock is the lockfile)
bun dev              # local dev server at http://localhost:3000
bun run check        # lint + typecheck + tests — run before every commit
bun run format       # Biome autofix (format + organize imports + safe lint fixes)
bun run build        # static export to ./out
bun run preview      # serve ./out locally to check the production build
```

## Stack

- **Next.js 16 App Router**, `output: "export"` — no server at runtime. Anything needing a server
  (API routes, `next/image` optimization, middleware, ISR, `cookies()`/`headers()`) will break the build.
  Route handlers like `sitemap.ts` / `robots.ts` must set `export const dynamic = "force-static"`.
- **React 19**, TypeScript strict, `@/*` → `src/*`.
- **Tailwind CSS v4** — config lives in `src/app/globals.css` (`@theme`), there is no `tailwind.config`.
  Color tokens (`--background`, `--muted`, `--accent`, …) are defined once there with a dark-mode override.
- **Motion** (`motion/react`, formerly Framer Motion) for UI animation. Wrap scroll-in content with
  `<Reveal>` from `src/components/reveal.tsx` rather than hand-rolling `motion.div`s.
- **three.js via React Three Fiber + drei** for the hero scene: a procedural stingray (`src/components/stingray.tsx`) on a fixed full-page canvas that
  slowly follows the mouse (desktop only; touch input is ignored). It is not draggable.
- **Biome** for lint + format (no ESLint/Prettier). **bun test** for unit tests.

## Layout

```
src/
  app/            routes, layout, metadata, sitemap/robots, globals.css
  components/     sections.tsx (server), reveal.tsx, scene-backdrop.tsx, hero-scene.tsx, stingray.tsx (client)
  content/site.ts ALL copy, links and roles — edit here, not in components
public/           static assets; CNAME must stay `rayhuang.us`
```

## Conventions

- Components are Server Components by default. Add `"use client"` only to leaf components that need
  hooks, browser APIs, Motion, or three.js.
- three.js must never render on the server: import 3D scenes through `next/dynamic` with `ssr: false`
  from a client wrapper (see `scene-backdrop.tsx`). Keep the scene cheap — capped `dpr`, low-power GL,
  no heavy postprocessing — it's decoration.
- Respect `prefers-reduced-motion`: use Motion's `useReducedMotion()`; the 3D scene goes still and
  `<Reveal>` skips its entrance animation.
- New images go in `public/images/` and are referenced as `/images/...`. `src/content/site.test.ts`
  fails if a referenced image is missing or a link isn't https — extend it when adding content types.
- Accessibility: decorative images get `alt=""`, sections use `aria-labelledby`, links that open a new
  tab use `rel="noreferrer"`.

## Deploy

`.github/workflows/ci.yml` runs lint/typecheck/test/build on every PR and push. Pushes to `main` also
deploy `./out` to GitHub Pages via `actions/deploy-pages` (repo Settings → Pages → Source must be
**GitHub Actions**). Don't reintroduce the `gh-pages` branch or `gh-pages` npm package.

The domain `rayhuang.us` is registered at eNom and its DNS (siteprotect.com) is **not** managed from this
repo — A records point at GitHub Pages' 185.199.108–111.153.
