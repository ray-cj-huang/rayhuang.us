# rayhuang.us

Personal site for Ray Huang.
A static Next.js export, hosted on GitHub Pages at https://rayhuang.us.

## Commands

Use **Bun** for everything. Never use npm, yarn or pnpm, and never commit a `package-lock.json`.

```bash
bun install          # deps (bun.lock is the lockfile)
bun dev              # dev server at http://localhost:3000
bun run check        # lint + typecheck + tests; run before every commit
bun run format       # Biome autofix: format, organize imports, safe lint fixes
bun run build        # static export to ./out
bun run preview      # serve ./out to check the production build
```

## Skills

Project skills live in `.claude/skills/`. Use them:

- `nextjs-docs`: read the installed Next.js docs before touching any Next.js API.
- `verify-ui`: preview the build and check UI or 3D changes, including hidden-pane screenshot gotchas.
- `ship`: check, commit, push to `main` and confirm the deploy.

## Stack

- **Next.js 16 App Router** with `output: "export"`, so there is no server at runtime.
  APIs that need one (API routes, middleware, ISR, `cookies()`, `headers()`, image optimization) break the build.
- **React 19**, TypeScript 7 in strict mode, `@/*` → `src/*`.
- **Tailwind CSS v4.** Config lives in `src/app/globals.css` (`@theme`); there is no `tailwind.config`.
  Color tokens such as `--background`, `--muted` and `--accent` are defined once there, with a dark-mode override.
- **Motion** (`motion/react`) for UI animation.
  Wrap scroll-in content in `<Reveal>` from `src/components/reveal.tsx` instead of hand-rolling `motion.div`s.
- **three.js via React Three Fiber and drei** for a fixed, full-page ocean (`src/components/ocean/`).
  The water deepens from sunlit aqua to navy as you scroll, with god rays, caustics and marine snow.
  A procedural stingray drifts near and far and slowly follows the mouse on desktop; it ignores touch and is not draggable.
  A boids-driven fish school flocks and swerves away from the ray.
- **Biome** for lint and format (no ESLint or Prettier). **bun test** for unit tests.

## Layout

```
src/
  app/            routes, layout, metadata, sitemap/robots, globals.css
  components/     sections.tsx (server); reveal.tsx, scene-backdrop.tsx (client)
  components/ocean/ the 3D scene: ocean-scene, stingray, fish-school, light-rays, marine-snow;
                  pure, unit-tested logic in boids.ts and palette.ts
  content/site.ts all copy, links and roles; edit here, not in components
public/           static assets; CNAME must stay `rayhuang.us`
.claude/skills/   project skills (see above)
```

## Conventions

- Components are Server Components by default.
  Add `"use client"` only to leaf components that need hooks, browser APIs, Motion or three.js.
- three.js must never render on the server.
  Load 3D scenes through `next/dynamic` with `ssr: false` from a client wrapper, as `scene-backdrop.tsx` does.
- Keep the scene cheap: capped `dpr`, low-power GL, no postprocessing. It's decoration.
  Phones get fewer fish and particles and no caustics.
- Keep simulation and color math in pure modules (`boids.ts`, `palette.ts`) with `bun test` coverage.
- Text outside cards uses depth-aware tokens (`--depth` set on scroll by `SceneBackdrop`), so it lightens as the water darkens.
  Cards pin their own text colors and stay readable at any depth.
- Respect `prefers-reduced-motion` with Motion's `useReducedMotion()`.
  The stingray goes still and `<Reveal>` skips its entrance animation.
- New images go in `public/images/` and are referenced as `/images/...`.
  `src/content/site.test.ts` fails if a referenced image is missing or a link isn't https; extend it for new content types.
- Strip EXIF/GPS metadata from photos before committing them.
- Accessibility: decorative images get `alt=""`, sections use `aria-labelledby`,
  and links that open a new tab use `rel="noreferrer"`.

## Comments

- Default to none. Names and types carry the meaning.
- Write a comment only for the non-obvious *why*: a statistical choice, an API quirk, a workaround (with a link).
- Use TSDoc `/** */` on exported APIs whose contract the types don't make obvious.
- In a multi-line comment, end each line at the end of a phrase or sentence.
- Bullets are one line each.
- No commented-out code, and no TODO without an issue link.

## CI/CD

`.github/workflows/ci.yml` runs on every PR and every push to `main`:

- `check` (lint, typecheck, test) and `build` run in parallel.
- On `main`, `deploy` publishes `./out` to GitHub Pages once both pass.
  It uses its own `pages` concurrency group and never cancels a deploy in progress.
- Actions are pinned to full commit SHAs with a version comment. Keep new ones pinned the same way.
- Jobs get least-privilege `permissions`, and checkout runs with `persist-credentials: false`.
- Dependabot groups updates and waits out a 7-day cooldown on new releases.

Repo Settings → Pages → Source must be **GitHub Actions**.
Don't reintroduce the `gh-pages` branch or the `gh-pages` npm package.

The domain `rayhuang.us` is registered at eNom.
Its DNS (siteprotect.com) is **not** managed from this repo; the A records point at GitHub Pages (185.199.108–111.153).
