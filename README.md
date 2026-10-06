# rayhuang.us

Source for [rayhuang.us](https://rayhuang.us). It's built with Next.js (static export), Bun, Tailwind CSS v4, Motion and React Three Fiber, and deployed to GitHub Pages by GitHub Actions.

```bash
bun install
bun dev
```

To change the site's text, edit [`src/content/site.ts`](src/content/site.ts). Run `bun run check` before you push. Every push to `main` deploys the site automatically.

See [CLAUDE.md](CLAUDE.md) for architecture and conventions.
