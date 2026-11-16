# Release & Issue Tracking

Versioning is one repo-wide line via release-please (`release-please-config.json`, `.release-please-manifest.json`): a single `quizaroni` component at the root, tagged `vX.Y.Z`. The release PR also bumps the `apps/web`, `apps/server` and `apps/api` package.json versions. Publishing a release runs `.github/workflows/release.yml`, which attaches the five binaries and pushes `ghcr.io/yusufaf/quizaroni`. The `web-v*`/`api-v*` tags are history from before the switch.

## Milestones

- One GitHub milestone per release, named to match the tag: `v0.4.0`.
- Milestones = "which release". Labels (`bug`, `enhancement`, ...) = "what kind". Don't use milestones as a kanban/status board.
- Only put issues in a milestone once they're actually committed to that release — an untargeted issue (like a large audit-sized item) stays milestone-less until it's scoped down into something a release can carry.
- Close a milestone once its release is tagged.

## Issue hygiene

- Merged PRs often reference an issue number in the title/commit (e.g. `(#32)`) without an actual `Closes #32` — this does **not** auto-close the issue. Check `gh issue view <n> --json state,closedAt` or the issue's linked-PRs before assuming an issue tracks *unshipped* work.
