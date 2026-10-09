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
  It models an open Caribbean sand flat with two coral heads, where southern stingrays forage.
  Keep the seafloor sparse: rays favor open sand, and a busy floor competes with the content.
  Scrolling descends: turquoise shallows deepen to ocean blue and the view tilts toward the sand.
  A procedural stingray drifts near and far, slowly follows the mouse on desktop (never touch), and casts a soft shadow.
  Fish never follow the cursor: a baitfish ball and a few French grunts school on their own and avoid the ray.
- **Schooling follows published models, not classic boids.** `boids.ts` uses Couzin's zones (repulsion first,
  then alignment and attraction), a few nearest neighbors, a blind zone behind each fish, limited turn rate,
  acceleration and pitch, per-fish pace, and a startle burst near the ray (flash expansion / fountain effect).
- **Sand detail lives in the shader** (`sand.ts`): ripples are ~0.4 units (about 25 cm) apart, far too fine to model,
  so they're drawn as asymmetric normal ripples with forks, plus grain, trough detritus and caustics.
  In GLSL, avoid reserved words such as `patch`, `sample` and `input` as identifiers.
- **Nothing passes through anything.** `boids.ts` steers fish around ellipsoid obstacles (the ray, coral heads,
  seaweed) and then enforces it with hard constraints, plus a minimum fish-to-fish distance.
  The two species swim in separate height bands, and the ray rises over coral heads instead of entering them.
- **Biome** for lint and format (no ESLint or Prettier). **bun test** for unit tests.

## Layout

```
src/
  app/            routes, layout, metadata, sitemap/robots, globals.css
  components/     sections.tsx (server); reveal.tsx, scene-backdrop.tsx (client)
  components/ocean/ the 3D scene: ocean-scene, stingray, fish-school + species, reef + sand + layout, light-rays, marine-snow;
                  pure, unit-tested logic in boids.ts and palette.ts; seeded layout via random.ts
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
- Company logos in `public/images/logos/` come from each company's LinkedIn page (`og:image`), re-encoded as JPEG.
- Icons follow the favicon "six files" practice: `src/app/favicon.ico` (16/32/48), `icon.png` (192),
  `apple-icon.png` (180, full bleed) and `manifest.ts` with 192/512 and a maskable 512 in `public/`.
  Tab icons are transparent renders of the scene's stingray with a soft dark edge; home-screen ones sit on turquoise.
  Re-render from the model rather than hand-draw if the stingray changes.
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
