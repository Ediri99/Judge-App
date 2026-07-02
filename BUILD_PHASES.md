# Build Phases

Build **one phase at a time**. For each: read the listed spec sections, build only what's in scope, satisfy the "Done when" checks, update `PROGRESS.md`, then stop for review. Follow `CLAUDE.md` throughout. Don't implement a later phase early.

---

## Phase 0 — Scaffold & design system
**Read:** JUDGE §3, §9; ADMIN §3, §9; `prototypes/`.
**Build:**
- Vite + React + TS (strict) project; install the stack from CLAUDE.md.
- `src/styles/tokens.css` with the exact tokens from JUDGE §9 (colors, fonts, radii); self-host fonts via `@fontsource`.
- Shared UI components matching the prototypes: Button, Input, Select (styled native), Toast, PhoneFrame, Card, Table, Pill, Medal, MetricCard, SliderRow, and a `StatusBadge` stub.
- Routing skeleton: judge routes (`/signin`, `/list`, `/score/:id`) and an admin shell (sidebar + empty panels).
- `vite-plugin-pwa` configured (manifest, precache app shell + fonts).
- `src/lib/firebase.ts` reading `VITE_FIREBASE_*` from env; add `.env.example`.
- `PROGRESS.md`, and README run steps.
**Out of scope:** real data, auth logic, real screen content.
**Done when:** `npm run dev` renders a themed judge shell and admin shell; `npm run build` passes; components/tokens visually match the prototypes.

---

## Phase 1 — Data model, Firebase, auth, rules, seed
**Read:** JUDGE §6, §11, §3.2; ADMIN §2, §5.
**Build:**
- TS types for every collection (JUDGE §6).
- Firestore init with offline persistence; Auth email/password.
- Roles: an **admin** claim/record; note the admin is **also a judge** (same UID). Route guards: judge area vs admin area.
- `firestore.rules`: judges read items/criteria and read/write **only** `${judgeId}_${itemId}` where `judgeId == auth.uid`; admin reads all + writes setup collections.
- A seed script that loads criteria (10 stall criteria; product & process sets), halls, and dummy stalls/universities/entries from the specs/prototypes (or the client's spreadsheets if present).
**Out of scope:** scoring screens, results.
**Done when:** can sign in as judge and as admin; guards work; rules pass a basic test; seed populates Firestore; types used throughout.

---

## Phase 2 — Judge · Stalls (online-first)
**Read:** JUDGE §4, §7, §9.
**Build:** Sign in (email/password) → Stalls list (Hall + Category dropdown filters, progress bar, green/red done/pending tints, sort) → Score (criteria rendered from config, 0–10 sliders, live total from weights, Notes). Submit writes the score doc `${judgeId}_${itemId}` to Firestore (**online only** for now) and is **editable after submit** (re-opening loads saved per-criterion values). Match `judge-app.html`.
**Out of scope:** offline engine, photos (leave a basic/in-memory photo stub), universities track.
**Done when:** a judge can score and edit stalls online; totals come from config; list shows done/pending correctly; visuals match the prototype.

---

## Phase 3 — Judge · Universities
**Read:** JUDGE §8.
**Build:** Reuse the track abstraction. Award-category + University filters (award select full-width), product/process criteria sets, entry block (Product/Process chip + entry name), total `/80` from config, violet "Universities" badge, ⚙ for process / ▦ for product. Same submit/edit path as stalls. Match `judge-university.html`.
**Out of scope:** offline, photos.
**Done when:** matches the prototype; both tracks share the same components with track-specific config only.

---

## Phase 4 — Offline engine (judge apps)
**Read:** JUDGE §5 (all).
**Build:**
- Enable Firestore offline persistence; gate its network with `enableNetwork()`/`disableNetwork()`.
- **Stable-connection detector:** lightweight ping with hysteresis (~2 good pings → online, ~2 failures → offline) + backoff.
- **Interval flush** (~20s) that runs only while stable; writes always commit locally first and confirm instantly.
- Soft-delete **tombstones**; deterministic ids + `updatedAt` last-write-wins; `navigator.storage.persist()`.
- Ensure edit-after-submit works offline.
**Out of scope:** photos (next phase); fancy status UI (basic states fine).
**Done when:** you can score offline (network throttled/airplane), reload and data persists, then on reconnect it syncs **once** (idempotent, no dupes), and it does **not** flush during a flapping signal.

---

## Phase 5 — Photos + sync-status UI
**Read:** JUDGE §5.2, §5.3(b), §5.6, §7 (photos).
**Build:** Capture (rear camera) → **compress** (~1280px / JPEG ~0.7) → store blob in an IndexedDB `photoOutbox` (`idb`), linked to its score. On each stable tick, **resumable-upload** queued blobs to Cloud Storage → write the URL onto `score.photos[]` → delete the local blob. Max **2** enforced. Photo upload is **independent** of score sync. Add the **sync-status badge** (Saved on device → Queued → Uploading → Synced → Retry) on list rows and after submit.
**Done when:** photos survive an offline hour, upload compressed on reconnect, statuses are visible, and scores still sync even if photo upload lags.

---

## Phase 6 — Admin: shell, auth gate, setup (both tracks)
**Read:** ADMIN §4, §7 (all), §11 (corrections).
**Build:** Admin shell (sidebar with Stalls / Universities / Event groups), admin-only gate. Setup CRUD:
- Halls & categories.
- **Criteria** (name, drag-reorder, `max`, `weight`; per track incl. product/process sets) — this is the config surface that drives judge scoring.
- Stalls (grid + add/edit form + image upload to Storage).
- **Judges** — email accounts (create/invite), list, progress. **Email + Progress only** (no code/PIN/assigned — that prototype layout is superseded).
- Universities; Award categories (+ type product/process); Entries (+ image).
**Out of scope:** results, exports.
**Done when:** the admin can fully configure an event; changing a criterion's max/weight changes judge scoring/totals; the Judges screen matches the confirmed model.

---

## Phase 7 — Admin: results, winners, exports
**Read:** ADMIN §6, §8; JUDGE aggregation rule.
**Build:**
- Stall Results leaderboard computed from `scores`: **avg = sum ÷ judges-in**, realtime, filters/sort, top-3 gold medals, pending sorted last, metric cards.
- University Results: a leaderboard **per award category** + a **Winners** view (the 6).
- Exports: Excel + PDF for both tracks, **reflecting the on-screen filter** (include pending).
- Do **not** build a stall "winner" designation (deferred).
**Done when:** results match the prototype and the aggregation rule; university winners show; exports produce real files scoped to the current filter.

---

## Phase 8 — Hardening, PWA/iOS, mobile nav, tests, polish
**Read:** JUDGE §10, §16; ADMIN §10.
**Build:** verify PWA installability; iOS `dvh` + add-to-home-screen behavior; admin mobile drawer nav; empty/loading/error states everywhere; Playwright **offline drill** (airplane for ~an hour → reconnect → single sync, no dupes) + key unit tests; accessibility pass; performance check.
**Done when:** the acceptance criteria in both specs pass and the offline drill is green.
