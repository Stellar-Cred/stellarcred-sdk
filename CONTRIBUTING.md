# Contributing to @stellar-cred/sdk

StellarCred participates in the [Drips Stellar Wave](https://www.drips.network/wave/stellar).
Issues in this repo are tagged with a complexity label and a Point value.
Completing an issue during an active Wave earns you Points, redeemable for
rewards. Please read this whole document before opening a PR.

## Before you start

- **Do not start work before you are assigned the issue.** Comment on the
  issue to request assignment and wait for a maintainer to assign you.
  Unassigned or unsolicited PRs will not be scored and may be closed.
- Check the issue's complexity label (`complexity: trivial`,
  `complexity: medium`, `complexity: high`) to understand the expected scope
  before committing to it.
- If an issue is unclear, ask clarifying questions in the issue thread
  first — don't guess and submit a PR that misses the mark.

## Branch naming

Use the pattern `type/issue-number-short-description`, e.g.:

```
fix/23-handle-missing-issuer
feat/31-add-batch-credential-query
```

Where `type` is one of `feat`, `fix`, `refactor`, `test`, `docs`, or `chore`.

## Development setup

```bash
git clone git@github.com:Stellar-Cred/stellarcred-sdk.git
cd stellarcred-sdk
npm install
npm test
```

## Pull request rules

- One issue per PR. Reference it with `Closes #<issue-number>`.
- Every new export or fixed bug must have a corresponding test in `test/`.
- `npm run typecheck`, `npm test`, and `npm run build` must all pass
  locally before you open the PR — CI enforces the same checks.
- TypeScript is `strict` with `noUncheckedIndexedAccess`. Do not introduce
  `any` types or `// @ts-ignore` comments.
- No `TODO`s or placeholder logic. If a change is too large to land
  completely, split it into smaller issues instead.
- Keep PRs focused. Unrelated formatting or refactors should be their own PR.
- Fill out the PR template completely, including the testing checklist.

## Review & rewards

Once your PR is merged and the maintainer marks the issue resolved before
the Wave ends, your Points are recorded automatically. See
[docs.drips.network/wave/points-and-rewards](https://docs.drips.network/wave/points-and-rewards)
for how payouts work.
