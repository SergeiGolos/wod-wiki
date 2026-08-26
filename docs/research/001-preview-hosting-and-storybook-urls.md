# Research: Preview Hosting Infrastructure and Storybook URL Scheme

**Ticket:** [#980](https://github.com/SergeiGolos/wod-wiki/issues/980)  
**Date:** 2026-08-26  
**Status:** Decided  

---

## 1. Executive Summary & Decisions

1. **PR Storybook Previews:** `https://<slug>.story.wod.wiki`
   - Maps to S3 prefix `s3://$S3_BUCKET/<slug>/storybook/`.
   - Served by the existing `*.story.wod.wiki` wildcard DNS / CloudFront configuration.
   - Built and uploaded in parallel with the Playground PR preview (`https://<slug>.preview.wod.wiki`).
2. **Main-Slug S3 Deployments:**
   - **Playground on S3:** `s3://$S3_BUCKET/main/dist/` (accessible at `https://main.preview.wod.wiki` and `https://preview.wod.wiki`).
   - **Storybook on S3:** `s3://$S3_BUCKET/main/storybook/` (accessible at `https://story.wod.wiki` and `https://main.story.wod.wiki`).
   - **GitHub Pages (Production):** Continues to deploy to `https://wod.wiki` from the main release job.
3. **Consolidated PR Notification:**
   - A single unified GitHub comment posted to the PR listing all preview URLs and test reports.
4. **Shared AWS Infrastructure:**
   - Both repositories already use the identical AWS S3 Bucket (`AWS_PREVIEW_S3_BUCKET`), CloudFront Distribution (`AWS_PREVIEW_CF_DISTRIBUTION_ID`), and IAM credentials (`AWS_PREVIEW_ACCESS_KEY_ID`, `AWS_PREVIEW_SECRET_ACCESS_KEY`).

---

## 2. Current Infrastructure Inventory

### 2.1 AWS & CloudFront Setup

| Parameter | Configuration | Used By |
| --- | --- | --- |
| **AWS Region** | `us-east-1` | Both repos |
| **S3 Bucket Secret** | `AWS_PREVIEW_S3_BUCKET` | Both repos |
| **CloudFront Distribution Secret** | `AWS_PREVIEW_CF_DISTRIBUTION_ID` | Both repos |
| **IAM Access Key Secret** | `AWS_PREVIEW_ACCESS_KEY_ID` | Both repos |
| **IAM Secret Key Secret** | `AWS_PREVIEW_SECRET_ACCESS_KEY` | Both repos |

### 2.2 S3 Bucket Key Space & Domain Routing

The CloudFront distribution routes requests to origin paths based on host headers (via CloudFront Functions / Origin Request policies):

| Host / Subdomain Pattern | S3 Origin Path Pattern | Description |
| --- | --- | --- |
| `https://<slug>.preview.wod.wiki` | `/<slug>/dist/index.html` | PR Playground preview |
| `https://preview.wod.wiki` / `https://main.preview.wod.wiki` | `/main/dist/index.html` | Main Playground on S3 |
| `https://<slug>.story.wod.wiki` | `/<slug>/storybook/index.html` | PR Storybook preview |
| `https://story.wod.wiki` / `https://main.story.wod.wiki` | `/main/storybook/index.html` | Main canonical Storybook |
| `https://<slug>.e2e.wod.wiki` | `/<slug>/e2e-report/index.html` | PR E2E HTML report |
| `https://e2e.wod.wiki` | `/main/e2e-report/index.html` | Main E2E HTML report |
| `https://wod.wiki` | GitHub Pages artifact | Production web application |

---

## 3. Workflow Integration

### 3.1 PR Pipeline Workflow Graph

On pull request update (`pull-request.yml`):
```mermaid
graph TD
  Slug[Derive Branch Slug] --> BuildTest[Build & Test Packages, Storybook, Playground in Parallel]
  BuildTest --> DeployPlayground[Deploy Playground to S3: s3://$S3_BUCKET/{slug}/dist/]
  BuildTest --> DeployStorybook[Deploy Storybook to S3: s3://$S3_BUCKET/{slug}/storybook/]
  DeployPlayground --> E2EPlayground[Run E2E vs https://{slug}.preview.wod.wiki]
  DeployStorybook --> E2EStorybook[Run Storybook E2E vs https://{slug}.story.wod.wiki]
  DeployPlayground --> PRComment[Post/Update Single PR Preview Comment]
  DeployStorybook --> PRComment
  E2EPlayground --> UploadReport1[Upload Report to s3://$S3_BUCKET/{slug}/e2e-report/]
  E2EStorybook --> UploadReport2[Upload Storybook Report Artifact]
```

### 3.2 PR Lifecycle (Deploy & Destroy)

- **Deploy:**
  - Playground sync: `aws s3 sync apps/playground/dist/ "s3://$S3_BUCKET/${BRANCH_SLUG}/dist/" --delete`
  - Storybook sync: `aws s3 sync apps/storybook/storybook-static/ "s3://$S3_BUCKET/${BRANCH_SLUG}/storybook/" --delete`
  - CloudFront invalidation: `aws cloudfront create-invalidation --distribution-id "$CF_DISTRIBUTION_ID" --paths "/${BRANCH_SLUG}/*"`
- **Destroy on PR Close:**
  - `aws s3 rm "s3://$S3_BUCKET/${BRANCH_SLUG}/" --recursive`
  - CloudFront invalidation: `/${BRANCH_SLUG}/*`

### 3.3 Main Pipeline Workflow Graph

On push to `main` (`main.yml`):
```mermaid
graph TD
  CalcVer[Calculate Version: {major}.{minor}.{run_number}] --> BuildTestMain[Build & Test Packages, Storybook, Playground in Parallel]
  BuildTestMain --> DeployS3Playground[Deploy Playground to S3: s3://$S3_BUCKET/main/dist/]
  BuildTestMain --> DeployS3Storybook[Deploy Storybook to S3: s3://$S3_BUCKET/main/storybook/]
  BuildTestMain --> DeployPages[Deploy Playground to GitHub Pages: https://wod.wiki]
  DeployS3Playground --> E2EMain[Smoke E2E vs https://wod.wiki & preview]
  DeployS3Storybook --> E2EStoryMain[Storybook Smoke E2E vs https://story.wod.wiki]
  E2EStoryMain --> ReleaseNPM[Release 5 NPM Packages to npmjs.com]
```

---

## 4. Verification & Validation Checklist

- [x] Verify AWS secrets names match across both repositories (`AWS_PREVIEW_*`).
- [x] Verify `playwright.storybook.config.ts` and `e2e/storybook.smoke.e2e.ts` in `wod-wiki-engine` already target `https://<slug>.story.wod.wiki` for PRs and `https://story.wod.wiki` for main.
- [x] Confirm S3 prefix structure isolates PRs by `${BRANCH_SLUG}/` so full teardown on close (`rm -rf s3://$S3_BUCKET/${BRANCH_SLUG}/`) cleans up playground, storybook, and e2e reports cleanly.
