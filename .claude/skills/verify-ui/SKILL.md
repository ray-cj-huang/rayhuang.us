---
name: verify-ui
description: Preview the production build and visually check a UI or 3D change, including the hidden-pane screenshot gotchas. Use after changing components, styles, content layout or the stingray scene.
---

# Verify a UI change

1. `bun run build`, then start the `preview` server from `.claude/launch.json`.
   It serves `out/` on port 4173, which is exactly what GitHub Pages will serve.
2. Read text and structure with `get_page_text` or `read_page` first; they are reliable.
3. For visuals, take a screenshot.
   When the browser pane is hidden, the page pauses `requestAnimationFrame`.
   Screenshots can then show stale frames, a half-faded `<Reveal>`, or a blank canvas.
   Take a second screenshot before concluding anything is broken.
4. To inspect content below the fold, force `<Reveal>` content visible first:

   ```js
   document.querySelectorAll('[style*="opacity"]').forEach((e) => { e.style.opacity = 1; e.style.transform = "none"; });
   document.getElementById("experience").scrollIntoView();
   ```

5. Check mobile with the `mobile` viewport preset, then reset to `desktop`.
6. Check `read_console_messages` for errors.
   A `THREE.Clock` deprecation warning comes from React Three Fiber 9 itself and is expected.

## Ocean scene specifics

- Check three depths: the top, the middle (`scrollTo` half of `scrollHeight - innerHeight`) and the bottom.
  The water goes from aqua to navy, god rays and caustics fade, and text outside cards turns light.
  `getComputedStyle(document.documentElement).getPropertyValue("--depth")` shows the current depth.
- The stingray follows the mouse only; touch and pen input are ignored by design.
  To test it, hover a corner, wait about 5 s with the pane visible, and take two screenshots.
  It also drifts near and far over about 20 s, so its size changes on its own.
- The canvas is fixed, full-page and `pointer-events: none`.
  It should never block clicks, text selection or scrolling.
- Measure frame rate with a 3 s `requestAnimationFrame` counter while `document.visibilityState` is `visible`.
- Shape problems usually come from mesh sampling, not the outline formula.
  See the comments in `src/components/ocean/stingray.tsx`.
