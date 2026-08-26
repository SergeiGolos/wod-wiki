# Inventory & Verification: CI Secrets, Variables & NPM Continuity

**Ticket:** [#984](https://github.com/SergeiGolos/wod-wiki/issues/984)  
**Date:** 2026-08-26  
**Status:** Completed  

---

## 1. Executive Summary

1. **AWS & Hosting Secrets:** **100% Ready in `wod-wiki`**. All 4 required `AWS_PREVIEW_*` secrets (`AWS_PREVIEW_ACCESS_KEY_ID`, `AWS_PREVIEW_SECRET_ACCESS_KEY`, `AWS_PREVIEW_S3_BUCKET`, `AWS_PREVIEW_CF_DISTRIBUTION_ID`) already exist in `wod-wiki` and match `wod-wiki-engine`.
2. **NPM Publishing Token:** **Action Required (Verification)**. `NPM_TOKEN` exists in `wod-wiki` (created 2025-04-17), but `wod-wiki-engine` holds a newer token (updated 2026-08-18). On cutover, ensure the token in `wod-wiki` has write access to the `@bitcobblers` scope on `registry.npmjs.org`.
3. **GitHub Environments:** **100% Ready in `wod-wiki`**. Both required environments (`github-pages` with `main` branch policy and `preview` for S3 deployments) already exist.
4. **Package Metadata:** `packages/*/package.json` manifests will be updated during workspace consolidation to add `"repository": { "type": "git", "url": "git+https://github.com/SergeiGolos/wod-wiki.git", "directory": "packages/<name>" }`.

---

## 2. Secrets Inventory & Comparison

| Secret Name | Exists in `wod-wiki` | Exists in `wod-wiki-engine` | Required For | Action Needed |
| --- | --- | --- | --- | --- |
| `AWS_PREVIEW_ACCESS_KEY_ID` | Yes (2026-07-27) | Yes (2026-08-18) | S3 & CloudFront preview/main deploy | None (Ready) |
| `AWS_PREVIEW_SECRET_ACCESS_KEY` | Yes (2026-07-27) | Yes (2026-08-18) | S3 & CloudFront preview/main deploy | None (Ready) |
| `AWS_PREVIEW_S3_BUCKET` | Yes (2026-07-27) | Yes (2026-08-18) | S3 bucket destination | None (Ready) |
| `AWS_PREVIEW_CF_DISTRIBUTION_ID` | Yes (2026-07-27) | Yes (2026-08-18) | CloudFront cache invalidation | None (Ready) |
| `NPM_TOKEN` | Yes (2025-04-17) | Yes (2026-08-18) | `npm publish` for `@bitcobblers/*` | **Human Action:** Verify / sync active `@bitcobblers` token to `wod-wiki` |
| `CODECOV_TOKEN` | Yes (2025-12-11) | No | Coverage reporting | None (Ready) |
| `VITE_CAST_APP_ID` | Yes (2026-03-02) | No | Chromecast integration | None (Ready) |
| `PREVIEW_REPO_PAT` | Yes (2026-05-08) | No | Legacy inter-repo sync | Obsolete post-merge |

---

## 3. Variables & Environments Inventory

### 3.1 Repository Variables

| Variable Name | Value in `wod-wiki` | Usage |
| --- | --- | --- |
| `G_TAG` | `G-H3KTK7YSHT` | Google Analytics tag replacement in HTML shells |
| `VITE_CAST_APP_ID` | `38F01E0E` | Production Chromecast Receiver App ID |
| `NPM_TARGET` | `wod-wiki-1179976...` | Legacy AWS CodeArtifact target (Obsolete for public npmjs) |

### 3.2 Environments in `wod-wiki`

| Environment Name | Protection Rules | Target Workflows | Status |
| --- | --- | --- | --- |
| `github-pages` | Protected: `main` branch policy | `main.yml` (`publish-playground`) | Ready |
| `preview` | None | `pull-request.yml` & `main.yml` (S3 sync) | Ready |
| `copilot` | None | Copilot workspace tasks | Unaffected |

---

## 4. Package Manifest Updates for NPM Continuity

When merging packages into `packages/*`, configure repository metadata in all 5 manifests (`packages/core`, `packages/lang`, `packages/wql`, `packages/engine`, `packages/ui`):

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/SergeiGolos/wod-wiki.git",
    "directory": "packages/core"
  },
  "bugs": {
    "url": "https://github.com/SergeiGolos/wod-wiki/issues"
  },
  "homepage": "https://github.com/SergeiGolos/wod-wiki#readme",
  "publishConfig": {
    "access": "public"
  }
}
```
