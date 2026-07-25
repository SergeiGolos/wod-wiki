# Subdomain-based preview routing (preview / story / e2e)

## Goal
Serve each preview artifact on its own subdomain — `{slug}.preview.wod.wiki` (playground, unchanged behavior), `{slug}.story.wod.wiki` (storybook), `{slug}.e2e.wod.wiki` (E2E report) — plus permanent main-branch deployments at `story.wod.wiki` and `e2e.wod.wiki`.

## Decision needed before starting
**Path-based alternative is dramatically simpler.** The current CF function already supports arbitrary prefixes under each slug. Path-based (`{slug}.preview.wod.wiki/storybook/`, `{slug}.preview.wod.wiki/e2e-report/`) needs ~10 lines of CF function changes + workflow additions, **zero new AWS resources**. The plan below is for the subdomain approach as requested — proceed only if URL aesthetics justify the infra cost. **User confirmed subdomain approach on 2026-07-25.**

## Architecture
- **Single CloudFront distribution** with multi-SAN cert, multi-alias.
- **Single S3 bucket** (existing `wod-wiki-production-previews`); prefixes match what workflows publish.
- **One host-header-aware CF function** picks S3 prefix from `Host` and rewrites every request URI. The browser sees root-relative URLs at each subdomain; the function injects the `/{slug}/{prefix}/` S3 path under the hood.
- Same IAM deployer; existing recursive `<slug>/*` delete already covers cleanup.
- **No artifact base-path config needed.** Storybook default `basePath=/` and Playwright default HTML reporter (relative `./` URLs) both render correctly when served at the root of their own subdomain.

| Host | S3 prefix |
|---|---|
| `{slug}.preview.wod.wiki` | `{slug}/dist/` (apex → `main/dist/`) |
| `{slug}.story.wod.wiki` | `{slug}/storybook/` (apex → `main/storybook/`) |
| `{slug}.e2e.wod.wiki` | `{slug}/e2e-report/` (apex → `main/e2e-report/`) |

## Tasks

### Phase 1: Infrastructure (wod-wiki-iac repo)

- [ ] **T1 — Expand ACM cert.** Edit `bootstrap.yml` `PreviewCertificate` to add `SubjectAlternativeNames`: `*.story.wod.wiki`, `story.wod.wiki`, `*.e2e.wod.wiki`, `e2e.wod.wiki` (keep existing `*.preview.wod.wiki`). Add matching `DomainValidationOptions` entries so CloudFormation auto-creates Route53 CNAMEs. Run `./scripts/deploy-bootstrap.sh`. → Verify: `aws acm describe-certificate --certificate-arn <arn> --query 'Certificate.DomainValidationOptions[].{Domain:DomainName,Status:ValidationStatus}'` shows all 5 domains `SUCCESS` within ~2 min.

- [ ] **T2 — Add CloudFront aliases + Route53 records.** In `templates/preview-site.yml`, extend `CloudFrontDistribution.DistributionConfig.Aliases` with the 4 new names. Add 4 new `AWS::Route53::RecordSet` resources (wildcard + apex for `e2e.wod.wiki` and `story.wod.wiki`), all aliasing the existing distribution's `DomainName`. Open PR; merge after `cfn-validate.yml` reports clean change set. → Verify: `dig +short story.wod.wiki` and `dig +short e2e.wod.wiki` return the CloudFront domain; `curl -H "Host: foo.story.wod.wiki" https://<cf-domain>/` reaches CloudFront (404 from S3 is fine at this point — function not updated yet).

- [ ] **T3 — Rewrite CF function for host-header routing (rewrites ALL paths).** Replace `SpaFallbackFunction.FunctionCode` body. Logic: parse `request.headers.host.value` → determine `{slug}` (first label, default `main` for apex) + `{type}` (`preview|story|e2e`); map type→S3 prefix (`preview`→`dist`, `story`→`storybook`, `e2e`→`e2e-report`); rewrite **every** request URI to `/{slug}/{prefix}/{rest-of-uri}` (empty rest → `index.html`). No static-asset pass-through, no path-based branch detection — the browser sees root-relative URLs at each subdomain and the function injects the S3 prefix under the hood. Drop the `/receiver/...` special-case (artifact never auto-deployed). Merge via PR. → Verify: (1) regression: `curl https://<existing-branch-slug>.preview.wod.wiki/` still serves the app and `/assets/*.js` load; (2) manual test: place `s3://wod-wiki-production-previews/test-branch/storybook/index.html` + a linked `test.css`, confirm `https://test-branch.story.wod.wiki/` and `https://test-branch.story.wod.wiki/test.css` both 200.

### Phase 2: Workflows (wod-wiki repo)

- [ ] **T4 — Add Storybook build + sync to `preview-deploy.yml`.** In the `build` job, after the playground build: run `bun run build-storybook` (default `basePath=/` is correct — the subdomain gives storybook its own root). Upload `storybook-static/` as a separate workflow artifact. In the `deploy` job, add a new step: `aws s3 sync storybook-static/ s3://$S3_BUCKET/$BRANCH_SLUG/storybook/ --delete --cache-control "max-age=300, must-revalidate" --exclude "*.map"`. → Verify: Push a test PR; `aws s3 ls s3://wod-wiki-production-previews/<slug>/storybook/` lists `index.html` + `iframe.html`.

- [ ] **T5 — Update PR comment with three links.** In `preview-deploy.yml` `comment` job, replace the single "E2E" row with three rows: `| Preview | [{slug}.preview.wod.wiki]({previewUrl}) |`, `| Storybook | [{slug}.story.wod.wiki]({storyUrl}) |`, `| E2E | ${e2eIcon} ${e2eTests}/${e2eFailures} — [{slug}.e2e.wod.wiki]({e2eUrl}) |`. → Verify: Open a PR; comment shows all three links; clicking each navigates to the right artifact.

- [ ] **T6 — Add main-branch deploy workflow.** New `.github/workflows/main-site-deploy.yml`, triggered on `push: branches: [main]`. Three jobs: (1) `deploy-preview` — reuse playground build + sync to `s3://$S3_BUCKET/main/dist/` (needed so E2E has something to test); (2) `deploy-storybook` — `bun run build-storybook` (default basePath), sync to `s3://$S3_BUCKET/main/storybook/`; (3) `run-e2e` — `uses: ./.github/workflows/preview-e2e.yml` with `preview-url: https://main.preview.wod.wiki` and `branch-slug: main`. → Verify: Merge to main; `curl https://story.wod.wiki/` serves the latest main storybook; `curl https://e2e.wod.wiki/` serves the latest main E2E report; `curl https://main.preview.wod.wiki/` serves the latest main playground.

### Phase 3: Verification

- [ ] **T7 — End-to-end smoke test.** Open a PR on a throwaway branch; confirm `{slug}.preview.wod.wiki`, `{slug}.story.wod.wiki`, `{slug}.e2e.wod.wiki` each serve the correct artifact and the comment links work. Then merge to main; confirm `story.wod.wiki`, `e2e.wod.wiki`, and `main.preview.wod.wiki` update. Then close the PR; confirm the three branch URLs now 404. → Verify: All five URLs behave as expected, asset requests (JS/CSS) load with no 404s.

## Done When
- [ ] `{slug}.preview.wod.wiki`, `{slug}.story.wod.wiki`, `{slug}.e2e.wod.wiki` each serve their artifact for any PR branch
- [ ] `story.wod.wiki` and `e2e.wod.wiki` reflect the latest main branch (storybook + E2E report)
- [ ] PR comment shows all three branch-scoped links
- [ ] Closing a PR removes all branch artifacts (existing recursive delete covers this)
- [ ] Storybook + Playwright reports render with all assets loading (no 404s) at subdomain roots

## Notes
- **No artifact base-path config needed.** Subdomain routing gives each artifact its own root URL. Storybook 10.x with default `basePath=/` and Playwright default HTML reporter (relative `./` URLs) both work without modification. Verified in `playwright.config.ts:43-45` (default reporter) and `.storybook/main.mjs` (no basePath).
- **CF function redesign is mandatory.** The current function uses path-based branch detection and static-asset pass-through, which won't work for host-based routing. T3 replaces it entirely with host-header parsing that rewrites every URI.
- **One distro vs three**: chose single distro + SAN cert for lower cost and unified invalidation. If independent cache policies per artifact become necessary later, split into three distros.
- **CF function size**: ~35 lines with host parsing (vs current ~30). CloudFront Functions have a 2 MB / 10 ms budget — well within limits.
- **No teardown for main-site**: permanent deployment; no destroy job needed.
- **`main.preview.wod.wiki` was not previously auto-deployed**. T6 step 1 adds this. If you don't want main on the preview subdomain, drop step 1 and run E2E against production `wod.wiki` instead.
- **Cross-repo coordination**: T1/T2/T3 land in wod-wiki-iac; T4–T6 land in wod-wiki. Deploy T3 before merging T5 or the new comment links will 404.
