# ADR 001: Container Registry and Image Tagging

## Status

Accepted

## Context

The store catalog stack currently runs as a Docker Compose application. Phase 0
prepares versioned, non-root images for Kubernetes (K3s) while Compose remains
the local development path. GitHub Actions will build images; FluxCD will
reconcile cluster state from Git.

We need a registry that:

- Fits the existing GitHub-hosted repository without a separate registry server
- Supports private packages and GitHub Actions OIDC/token auth
- Lets GitOps distinguish immutable build artifacts from production promotions

Images in scope: `store-api` (catalog API), `store-web` (unprivileged Nginx
front end), and a future `store-worker` (async review/cache jobs).

## Decision

Use **GitHub Container Registry (`ghcr.io`)** as the canonical registry.

### Image names

Given GitHub owner `<org-or-user>`:

| Component | Image |
|-----------|--------|
| Catalog API | `ghcr.io/<org-or-user>/store-api` |
| Web (Nginx) | `ghcr.io/<org-or-user>/store-web` |
| Worker (future) | `ghcr.io/<org-or-user>/store-worker` |

### Dual tagging

1. **Immutable SHA tags** — every successful CI build on the default branch
   (and PR builds that need a deployable artifact) pushes
   `sha-<short-commit>` (7–12 hex characters from `GITHUB_SHA`). These tags
   are never overwritten. FluxCD in **dev** auto-deploys the newest
   `sha-*` image via an `ImageRepository` + `ImagePolicy` (semver-incompatible
   glob / alphabetical policy on the `sha-` prefix, or a numerical policy on
   the commit timestamp annotation).
2. **SemVer tags** — `vX.Y.Z` (and optionally `vX.Y`, `vX`) are created only
   from Git tags / release workflow. FluxCD in **prod** uses an `ImagePolicy`
   with SemVer range (for example `>=1.0.0 <2.0.0`) so production promotes
   explicitly versioned images, not every commit.

`latest` is not used for cluster deploys.

### Promotion path

```
commit → GHCR sha-<short-commit> → Flux ImageUpdateAutomation (dev)
Git tag vX.Y.Z → GHCR vX.Y.Z → Flux ImagePolicy SemVer (prod)
```

## Consequences

- CI must log in to `ghcr.io` (`GITHUB_TOKEN` or a PAT with `packages:write`).
- Image names are namespaced under the GitHub owner; org package visibility
  and retention policies apply.
- Dev tracks commits automatically; prod changes only when a SemVer tag is
  pushed and Flux reconciles.
- Rollback is `flux suspend` + pin a previous `sha-*` or `vX.Y.Z` in Git, or
  retag/re-release.
- Compose local tags (`store-api:local`, `store-web:local`) stay independent
  of GHCR and do not change `docker-compose.yml`.
