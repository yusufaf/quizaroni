# Release & Issue Tracking

Versioning is per-package via release-please (`release-please-config.json`, `.release-please-manifest.json`) — `apps/web` and `apps/api` version independently. There is no single repo-wide version number.

## Milestones

- One GitHub milestone per package release, named to match the tag: `web v0.4.0`, `api v0.2.0`.
- Milestones = "which release". Labels (`bug`, `enhancement`, ...) = "what kind". Don't use milestones as a kanban/status board.
- Only put issues in a milestone once they're actually committed to that release — an untargeted issue (like a large audit-sized item) stays milestone-less until it's scoped down into something a release can carry.
- Close a milestone once its release is tagged.

## Issue hygiene

- Merged PRs often reference an issue number in the title/commit (e.g. `(#32)`) without an actual `Closes #32` — this does **not** auto-close the issue. Check `gh issue view <n> --json state,closedAt` or the issue's linked-PRs before assuming an issue tracks *unshipped* work.
