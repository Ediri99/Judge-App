# Progress

## Phase 0
- Created a Vite + React + TypeScript project scaffold.
- Added the shared design-token layer and prototype-inspired UI components.
- Implemented a judge shell with the Sign In / List / Score routes and an admin shell with empty panels.
- Added PWA configuration, an env example, and README run steps.

## Phase 1
- Added shared Firestore TypeScript models for events, judges, halls, criteria, stalls, universities, award categories, entries, and scores.
- Added a seed module with demo criteria, halls, stalls, universities, award categories, and entries.
- Added Firestore security rules for admin and judge-scoped score access.
- Added an auth provider with simple judge/admin sign-in and route guards for the judge and admin areas.
- Wired the Firebase initialization module so the app can use Firestore/Auth/Storage in the browser.

## Decisions
- Kept the Phase 1 implementation focused on the data model, auth shell, and guard behavior rather than launching the scoring screens yet.
- Used a lightweight seeded dataset so the app has a realistic Firestore shape without overbuilding the data layer.

## Follow-ups
- Connect the UI to real Firestore collections for judges and score lists in later phases.
- Add a real end-to-end auth and seed validation flow once Firebase credentials are available.
- Continue with Phase 2 once the current phase is reviewed.

## Phase 2
- Implemented the judge stalls list with hall/category filters, progress bar, and done/pending status tints.
- Added the stall scoring screen with criteria loaded from Firestore config, 0–10 sliders, notes, and computed totals.
- Score submission writes the deterministic `${judgeId}_${itemId}` score doc to Firestore and loads saved values on reopen.
- Kept the Phase 2 flow online-first and did not add offline photo or sync queue support yet.

## Decisions
- Phase 2 is limited to stalls only; university scoring and offline engine remain for later phases.
- Total calculation is driven from criterion `max` and `weight` values so the score model stays configurable.

## Questions
- Should the stall list sort prioritize hall order or stall number first when both are present?
- Do we want a separate `published` event flag or active track control in the data model for future admin gating?

## Phase 4
- Added the offline engine with Firestore IndexedDB persistence and a stable-connection ping loop.
- Gate Firestore network using `enableNetwork()` / `disableNetwork()` and only sync during stable 20-second windows.
- Integrated local-first score writes for both stalls and university entries through `writeScoreDoc()`.
- Requested storage persistence via `navigator.storage.persist()`.

## Follow-ups
- Verify the offline sync logic in a real network-flapping scenario to ensure it does not flush during unstable connectivity.
- Add UI indicators for sync state and pending offline writes in a later phase.

## Phase 5
- Added a photo outbox backed by IndexedDB so judges can capture and queue photos locally for later upload.
- Photos are compressed client-side before being queued and uploaded to Cloud Storage during stable connectivity windows.
- The judge list and scoring screens now show sync-state badges for Saved on device, Queued, Uploading, Synced, and Retry.
- Score writes remain local-first and continue to work even when photo uploads are pending.

## Phase 6
- Replaced the static admin shell with a real `AdminLayout` (sidebar grouped into Stalls / Universities / Event, admin-only via the existing `ProtectedRoute`) and nested routes under `/admin/...`.
- Built setup CRUD backed by live Firestore listeners (`useAdminCollection` hook): Halls & categories, Criteria (stall set + university product/process sets, with name/max/weight edit and up/down reordering), Stalls (grid + add/edit form + image upload to Cloud Storage), Universities, Award categories (name/type/order), Entries (university × award category + image upload).
- Judges screen shows Email + Progress only (no code/PIN/assigned), matches the confirmed model. "Add judge" creates a real Firebase Auth user via a secondary Firebase app instance (`getSecondaryAuth` in `src/lib/firebase.ts`) so the admin's own session isn't replaced, then writes `users/{uid}` (role) and `judges/{uid}` (profile) docs. Progress is submitted-score count across both tracks ÷ total items.
- Added an Event settings screen (name/year) and stubbed Results / Winners / Export panels with a "built in a later phase" placeholder, since results/exports are Phase 7 scope.
- Added a `judges` collection rule to `firestore.rules` (admin write, signed-in read) to support the new screen.
- `npm run build` passes.

## Decisions
- Criteria reordering uses simple up/down buttons that swap `order` values rather than a drag-and-drop library, to avoid a new dependency — satisfies "wire up real reordering" without adding drag/drop machinery.
- Judges CRUD only manages the `judges`/`users` collections directly (not through the generic `useAdminCollection` add path) because account creation needs the secondary-auth-app dance; every other setup screen reuses the shared hook.
- Results, Winners, and Export navigation items are present (per the confirmed nav structure in ADMIN §4) but render a placeholder — real leaderboard math and file generation are explicitly Phase 7.

## Follow-ups / open questions
- `firestore.rules` still checks `users/{uid}.data.role == 'admin'` (singular) while `AuthProvider` stores `roles` (an array) — this predates Phase 6 and should be reconciled before rules are enforced against a real project, or admin-gated writes will fail.
- Confirm whether "Progress" on the Judges screen should be per-track or combined (ADMIN §13 open question) — currently combined across stalls + entries.
- Confirm whether every university should be auto-listed per award category or only actual entrants (ADMIN §13) — Entries are currently added one at a time with no auto-generation.

## Phase 7
- Added `src/app/admin/aggregation.ts`: shared `aggregateItemScores` (average = sum of submitted judge totals ÷ number of judges who scored the item; every judge counts) and `rankByAverage` (descending, dense ties, unscored items pushed to the end with `rank: null` — the "pending sorts last" rule).
- Built `StallResultsPage`: realtime leaderboard (`onSnapshot` on `scores` via the new `useScores` hook) with Hall/Category/Sort filters (Category select disabled when none exist), metric cards (Stalls, Judges, Scored %, Avg score), top-3 gold medals, green "Full"/amber "Part" judges-in pills, grey "Pending" for unscored stalls, and an empty-filter state. Replaces the Phase 6 placeholder at `/admin/stalls/results`.
- Built `UniversityResultsPage`: one leaderboard per award category (selectable via dropdown, default "All categories" stacks all six), same rank/medal/pending treatment, scoped to each category's entries. Replaces the Phase 6 placeholder at `/admin/universities/results`.
- Built `WinnersPage`: the top-ranked entry (rank 1) in each of the 6 award categories, or "winner pending" if the category has no scores yet. Replaces the Phase 6 placeholder at `/admin/universities/winners`.
- No stall "winner" designation was added anywhere — `StallResultsPage` only shows ranked averages, per the deferred scope in ADMIN §6.3/§15.
- Added Excel exports (`xlsx`, dynamically imported) — Stalls: Summary sheet (rank, org, stall no, hall, category, average, judges-in) + Raw scores sheet (one row per judge × stall with each criterion score, total, notes). Universities: By-category, By-university, Winners, and Raw scores sheets.
- Added PDF exports (`pdfmake`, dynamically imported, pinned to `0.2.20` because `0.3.x` changed its vfs/font bootstrapping in a way that no longer matches the documented browser setup) — a formatted report with an event header and the ranked table(s); one section per award category for universities.
- **Export scope is exactly what's on screen**: both export functions read the same `ranked`/`categoryLeaderboards` arrays the table renders from, so the current Hall/Category/Sort (or award-category) selection is reflected 1:1 in the file, pending items included, no separate "export everything" path (clear filters first, per ADMIN §8's confirmed scope).
- Replaced the Phase 6 "Event › Export" placeholder with `ExportOverviewPage`, which explains the on-screen-filter export model and links to each track's Results screen (that's where the real Export Excel/PDF buttons live, matching the original prototype's per-panel header actions).
- `xlsx` and `pdfmake` add ~2.4MB minified; both are now lazy-loaded only when an export button is clicked and routed into a separate `vendor-export` chunk (`vite.config.ts` `manualChunks`) that's excluded from the PWA precache (`globIgnores`) — appropriate since exports are admin-only/online-first and were never part of the offline judge app shell requirement. Also raised `maximumFileSizeToCacheInBytes` to 3 MiB as a safety margin for the remaining precached bundle.
- `npm run build` passes (`tsc -b && vite build`, including the PWA precache step).

## Decisions
- Aggregation and ranking live in one shared module (`aggregation.ts`) used by both results pages, the Winners page, and both export paths, so the sum-÷-judges-in formula and the pending/tie rules can't drift between the on-screen table and the exported file.
- Chose dense ranking with true ties left tied (two stalls averaging the same score both get rank 2, next gets rank 3) rather than skip-ranking, matching "ties left tied" in the Confirmed Decisions block literally.
- University results default to "All categories" stacked as separate cards (rather than forcing a single-category view) so the admin can see all 6 at a glance, with the dropdown as a narrowing filter — the spec allowed either.
- Per-criterion figures in Excel raw sheets are read straight from each `ScoreDoc.criteria` map (already computed at judge-submit time), not recomputed — same as the summary `total`, so totals never silently disagree between judge app and admin exports.

## Follow-ups / open questions
- Could not exercise this phase against live Firestore data — `.env.local` has no real Firebase project configured (same limitation noted implicitly in earlier phases), so verification here is `tsc -b` + `vite build` passing cleanly, not an in-browser click-through with real scores. Recommend a manual pass once a project/seed data is available: submit a few judge scores, confirm the leaderboard updates live, and open both exported files.
- Stall "winner" scope is still deferred per the client (ADMIN §6.3) — the results page intentionally stops at ranked averages with no seam-breaking "winner" flag.
- The "Judges" count used for the Judges-in "Full/Part" pill is `judges.items.length` (all judges in the roster) for both tracks — if the client later wants separate per-track judge rosters, this will need to change, but the spec currently says every judge scores everything.
