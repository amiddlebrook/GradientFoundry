# GradientFoundry — Phase 26: Deterministic leakage-safe cross-validation

## Purpose

Groups normalized duplicate examples before seeded fold assignment, reports fold balance, label coverage, annotation contradictions, and confirms training was not performed.

## Production API

`GET /api/datasets/:id/cross-validation?folds=5&seed=42`

Example: `No body`

The endpoint is authenticated through the existing Cloudflare Worker authorization layer. No paid dependency or new mandatory Cloudflare resource is introduced. Production defaults to remote inference disabled; limits and account-wide quotas still apply.

## Interface

The product-specific UI integrates this operation in its existing workflow via `lab-fold-form`. Interactions provide explicit labels and status messages and reuse the application's own visual language.

## Verification

- `npm run check` and `npm run verify:release`
- `npm test`, including `tests/phase26.test.mjs`
- CI and deployment contract checks for the Phase 26 UI and API
- Do not claim browser-level UX acceptance from API smoke tests.

## Not a final enterprise certification

Missing: tenant-level authorization, independent penetration testing, failover/load validation, recoverability drills, realistic end-to-end browser automation and an accessibility audit. These require explicit measured acceptance before any enterprise-production claim.
