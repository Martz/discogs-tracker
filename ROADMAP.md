# discogs-tracker Roadmap

**As of:** 2026-10-09, assessed at `main` `ba8b4a5`.

Everything in this document is a recommendation, not a commitment. The [Decisions](#decisions) section lists the choices only you can make; the rest of the roadmap changes shape depending on how you answer them.

## Executive summary

**Maturity: Alpha.** This is a real TypeScript CLI (~2k LOC) with a coherent module layout (`src/cli.ts`, `commands/`, `db/`, `services/`, `types/`, `utils/`, `workers/`), strict `tsc` passing, and working config, sync, value, list, and history commands. It syncs a Discogs collection into a local SQLite database via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), fetches marketplace prices on worker threads, and reports collection value and price history.

It is not beta, because: 8 of 109 tests fail; the `trends` and `demand` analysis commands likely crash on a SQL row-shape bug; there is no CI; the READMEs overclaim capabilities the code does not have; Node 24 cannot install the package; and version `1.0.0` has no releases behind it.

## Current capabilities

Commands that work today:

- `config` — set up Discogs token, username, and tracking settings (stored via `conf`; see the caveat in [Next](#next--p1-quality-and-robustness) about display masking)
- `sync` — pull collection and wants, then fetch prices through a worker-thread pool
- `value` — total collection value and per-release pricing
- `list` — browse the synced collection
- `history` — price history for a release

**Broken today:** `trends` and `demand`. Their analysis queries return flat SQL rows (`r.*`, `current_price`, `wants_count`), but the callers index into a nested `release` object, so `r.release.id` throws `TypeError`. See [References](#references).

## Goals and non-goals

This section is provisional — it is pending the three open decisions in [Decisions](#decisions).

Goals (recommended):

- A trustworthy daily-driver CLI: the commands that exist do what they claim, on the Node versions people actually use
- Tests and CI that catch regressions before they ship
- Documentation that matches the code

Non-goals (recommended, until the decisions say otherwise):

- npm publication — blocked on the packaging items in [Later](#later--p2-product-and-packaging)
- New analysis features (format filtering) before the foundations land
- A language rewrite unless [Decision 1](#1-typescript-vs-rust-rewrite) selects it

## Now — P0 engineering foundations

Highest-priority, smallest-effort items that make the project credible to change. Priority/effort per item.

1. **Add CI running `vitest run` + `tsc` on push/PR, and make `"test"` non-watch.** `package.json` sets `"test": "vitest"` (watch mode), which hangs any CI that invokes it. High, small. *Moot in its vitest form if [Decision 1](#1-typescript-vs-rust-rewrite) adopts Rust — but the CI workflow itself is needed either way, only the toolchain changes.*
2. **Fix the SQL row mapping.** `getReleasesWithPriceChange`, `getHighDemandReleases`, and `getOptimalSellCandidates` return flat rows cast `as any[]`, while `trends`/`demand` expect `{ release, currentPrice, ... }`. Mapping to the documented shape unblocks both commands and 6 failing database tests. High, medium. *Moot if Rust is adopted, since these queries are rewritten.*
3. **Fix the worker-pool queue.** `processNextTask` posts `taskQueue[0]` to a worker without dequeuing it, and the in-flight task is not resolved when picked up — concurrent workers can duplicate the first task and callers can hang. High, small. *Moot if Rust is adopted; the Rust rewrite (Martz/discogs-tracker#9) replaces this pool.*
4. **Drop the unused `sqlite3` and `dotenv` dependencies; add an `engines` field pinning Node 20, or upgrade better-sqlite3.** better-sqlite3@9 has no Node 24 prebuild and needs C++20 to compile, so `npm install` fails outright on current Node. High, small. *The better-sqlite3 part becomes moot under Rust.*
5. **Resolve the `npm audit` criticals** — 5 critical vulnerabilities today (vitest, @vitest/coverage-v8, @vitest/ui, tinypool, tar), mostly in dev dependencies. High, small. *Moot under Rust's toolchain.*
6. **Repair the failing test infrastructure:** fix the `tests/utils/config.test.ts` mock-hoisting load failure, and make `getLatestPrice`/`getReleaseInfo` return `null` (better-sqlite3 returns `undefined` for no rows, but the types promise `| null`). Medium, small.
7. **Honest documentation.** Rewrite the root README and the 7 nested READMEs to match the code: the config directory is `discogs-price-tracker` (the `conf` project name), not `discogs-tracker`; remove claims about a 60/min rate limiter, exponential backoff, request queueing, smart caching, "8x faster", automatic migration backups, OS keychain storage, and methods that do not exist (`getRelease`, `getPriceChanges`, `getCollectionValue`, `WorkerPool.addBatch`). High, small.

## Next — P1 quality and robustness

After the foundations, in rough priority order.

- **Command tests that invoke the real commander actions.** Command coverage is thin: only `value` is tested, and its test re-implements the math instead of running the command. Medium, medium.
- **429 handling and honest rate limiting.** Today rate limiting is 1-second sleeps between pages, folders, and batches; backoff exists only in the worker's `fetchWithRetry`. Handle `429` with `Retry-After` and spread the 60 req/min budget across all workers. Medium, medium.
- **Input guards.** `sync` throws when a release lacks `artists[0]`/`formats[0]`; `value` divides by the record total with no empty-collection guard. Medium, small.
- **Global `--debug` flag** — tracked as Martz/discogs-tracker#4 with a draft implementation in Martz/discogs-tracker#5. Medium, small.
- **Token masking and disclosure.** `config --show` should mask the token to its tail, and the docs should state plainly that the token is stored in plaintext by `conf`. Medium, small.
- **Honor `checkInterval`.** It is stored in config but never read; scheduling ignores it. Low, small.
- **Dead-code removal.** `getCollection`/`getAllMarketplaceListings` are unused. Low, small.
- **Migration down-SQL plus real backups, or delete the claim.** `migrate --rollback` exists, but the documented "automatic migration backups" do not. Medium, small.

## Later — P2 product and packaging

- **Format filtering (vinyl vs CD)** — tracked as Martz/discogs-tracker#6 with draft Martz/discogs-tracker#7; note it overlaps the existing `value -f` option. Revisit after the decisions: it may be absorbed by a rewrite or superseded by `value -f`. Medium, medium.
- **Release engineering.** A changelog, real semver (the `1.0.0` in `package.json` and `cli.ts` is aspirational — there are no releases), a filled-in `author`, and `repository`/`files`/`main` fields. Low, small.
- **First GitHub release.** Low, small.
- **npm publish readiness** — only meaningful if [Decision 2](#2-personal-cli-vs-npm-published-product) chooses "published product"; note the `npm link` issue: the data directory resolves relative to the compiled `__dirname`, which breaks a global install. Low, small.
- **Disposition of Martz/discogs-tracker#1** ("Add Claude Code GitHub Workflow"): those are @claude PR-review bots needing `ANTHROPIC_API_KEY`, not test/build CI — merge with a key, or close in favor of the P0 CI workflow. Low, small.

## Decisions

These three are yours to make; the roadmap holds both branches open until you do.

### 1. TypeScript vs Rust rewrite

**Recommendation: stay TypeScript.** The rewrite (Martz/discogs-tracker#8, draft in Martz/discogs-tracker#9, ~24 files) restarts development while leaving every maturity problem unsolved: it does not add CI, does not fix the failing tests, and does not make the docs honest. The existing CLI works today.

- **If Rust:** the P0 SQL row-mapping and worker-pool fixes (items 2–3 above) become moot — the rewrite replaces them. CI, dependency audits, and honest docs still apply, retooled for Cargo. The P0 list shrinks by roughly half; the rewrite itself becomes the largest P0 item.
- **If TypeScript:** the P0 list above applies as written.

### 2. Personal CLI vs npm-published product

**Recommendation: personal CLI for now.** The tool stores your token in plaintext and resolves its data directory relative to its install location; neither is acceptable for a published package.

- **If published product:** packaging moves from Later into Now — `author`, `repository`/`files`/`main` fields, install-path-safe data storage, and token handling become P0, and the docs need an audience beyond yourself.
- **If personal CLI:** packaging stays in Later at low priority, and npm publication drops out of scope entirely.

### 3. Foundations-first vs product-features-first

**Recommendation: foundations-first.** The format filter and `--debug` already have draft PRs (Martz/discogs-tracker#7, Martz/discogs-tracker#5) and are tempting to ship, but they would land on code with 8 failing tests, no CI, and broken analysis commands.

- **If features-first:** merge the draft PRs before the P0 list; the user-visible wins arrive sooner, but regressions stay invisible and `trends`/`demand` stay broken longer.
- **If foundations-first** (recommended): the draft PRs hold until the P0 items land, then merge onto a tested, CI-covered base.

## References

Evidence for the claims above, all at `ba8b4a5`:

- SQL row-shape bug: flat rows returned `as any[]` in `src/db/database.ts:178`, `src/db/database.ts:241`, `src/db/database.ts:308`; nested access that throws in `src/commands/trends.ts:28` and `src/commands/demand.ts:33`
- Worker-pool duplicate-task bug: `src/utils/worker-pool.ts:60-69` (`processNextTask` posts `taskQueue[0]` without dequeuing)
- Private-db access via `as any`: `src/commands/migrate.ts:15`
- Null-vs-undefined returns: `src/db/database.ts:104-113` and `src/db/database.ts:126-132`
- better-sqlite3 the only driver imported: `src/db/database.ts:1`; dead `sqlite3`/`dotenv` deps and watch-mode `"test"`: `package.json:13`, `package.json:27`, `package.json:30`
- Data directory relative to compiled `__dirname` (breaks global installs): `src/db/database.ts:15`
- Tests on Node 20: 101 pass / 8 fail — `tests/utils/config.test.ts` (suite fails to load, mock hoisting), `tests/db/database.test.ts` (6 failures), `tests/integration/sync-workflow.test.ts` (2 brittle mock-count failures)
- `npm audit`: 35 vulnerabilities, 5 critical (vitest, @vitest/coverage-v8, @vitest/ui, tinypool, tar)
- No `.github` workflows on `main`; Martz/discogs-tracker#1 adds Claude bot workflows only
- Hardcoded `1.0.0`: `package.json:3` and `src/cli.ts`; empty `author`, no `repository`/`files`/`main`/`engines`: `package.json`
- Existing GitHub work (reference, not duplicated here): issues Martz/discogs-tracker#4 (`--debug`), Martz/discogs-tracker#6 (format filter), Martz/discogs-tracker#8 (Rust rewrite); draft PRs Martz/discogs-tracker#5, Martz/discogs-tracker#7, Martz/discogs-tracker#9; PR Martz/discogs-tracker#1 (Claude workflows)
