# rayhuang.us

Source for [rayhuang.us](https://rayhuang.us), Ray Huang's personal site.
Under the content sits a live 3D Caribbean sand flat: a stingray forages and schools of fish swim past, and the water deepens as you scroll.

Built with Next.js 16 (static export), React 19, Tailwind CSS v4, Motion and React Three Fiber.
GitHub Actions deploys it to GitHub Pages.

## Develop

Requires [Bun](https://bun.sh) 1.4 or newer.

| Command | What it does |
| --- | --- |
| `bun install` | Install dependencies |
| `bun dev` | Dev server at http://localhost:3000 |
| `bun run check` | Lint, typecheck and test; run before every push |
| `bun run format` | Autofix formatting and imports |
| `bun run build` | Static export to `out/` |
| `bun run preview` | Serve `out/` as GitHub Pages would |

## Edit content

All text, roles, links and SEO fields live in [`src/content/site.ts`](src/content/site.ts).
Images go in `public/images/`; the tests fail if one is missing.
If roles change, also update [`public/llms.txt`](public/llms.txt).

## Deploy

Every push to `main` runs CI and, once it passes, publishes to GitHub Pages.

See [CLAUDE.md](CLAUDE.md) for architecture, the ocean scene and conventions.
