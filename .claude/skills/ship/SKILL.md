---
name: ship
description: Check, commit, push to main and confirm the GitHub Pages deploy of rayhuang.us. Use when asked to push, deploy, ship or "push to prod".
---

# Ship to rayhuang.us

Pushing to `main` deploys the site, so only ship work the user asked to publish.

1. Run `bun run format`, then `bun run check` and `bun run build`. Stop and fix any failure.
2. Review `git status` and `git diff`.
   Stage only the files for this change.
   If the user has unrelated uncommitted edits, leave them unstaged and say so.
3. Commit with a short imperative subject, plus the co-author trailer from the session instructions.
4. `git push origin main`.
5. Watch the run until it finishes:

   ```bash
   RID=$(gh run list -R ray-cj-huang/rayhuang.us -w ci.yml -b main -L 1 --json databaseId --jq '.[0].databaseId')
   gh run watch "$RID" -R ray-cj-huang/rayhuang.us --exit-status --compact
   ```

6. Confirm the change is live, for example `curl -s https://rayhuang.us/ | grep -o "<new text>"`.
   The 3D scene loads in a separate chunk, so it won't appear in the HTML.

If CI fails, read the failing step with `gh run view "$RID" --log-failed` and fix forward.
Don't force-push or rewrite `main`.
