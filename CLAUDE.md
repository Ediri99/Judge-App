# Project: Event Judging System

A two-part web system for judging an exhibition:
- **Judge apps** — score exhibitor **stalls** and university **entries** on a phone; must work **offline** (venue has weak signal).
- **Admin/results app** — organizer sets up the event, watches live leaderboards, exports results.

## Source of truth (read before coding; don't restate, follow)
- `JUDGE_APPS_DEV_SPEC.md` — the two judge apps.
- `ADMIN_APP_DEV_SPEC.md` — admin/results app (inherits from the judge spec).
- `prototypes/*.html` — approved static UI mockups. Exact design tokens, markup, and reference JS live here — **match them**.
- `BUILD_PHASES.md` — the phased plan. Build **one phase at a time**.

*(If the spec filenames in this folder differ slightly, use whatever is actually here.)*

## Stack (fixed unless told otherwise)
- React 18 + TypeScript (strict) + Vite.
- PWA via `vite-plugin-pwa` (Workbox) — installable, offline app shell.
- Firebase: Firestore (offline persistence), Cloud Storage, Auth (email/password), Hosting.
- IndexedDB via `idb` (photo outbox). Image compression via `browser-image-compression`.
- Fonts self-hosted: `@fontsource/fraunces`, `@fontsource/inter` (must render offline).
- Exports: `xlsx` (SheetJS) + `pdfmake`.
- Tests: Vitest + React Testing Library; Playwright for e2e (incl. the offline drill).
- Styling: plain CSS + CSS Modules using tokens from JUDGE spec §9 (put them in `src/styles/tokens.css`). No Tailwind.

## Architecture principles (non-negotiable)
- **One codebase, two "tracks"**: `stalls` and `universities`. Abstract the item model, criteria source, totals denominator, filters, and badge — everything else is shared.
- **Judges are offline-first** (JUDGE §5): write-local-first, confirm instantly, sync only during ~20s **stable-connection** windows. Score doc id is deterministic `${judgeId}_${itemId}`; `updatedAt` gives last-write-wins; deletes are soft **tombstones**; scores are **editable after submit**.
- **Admin is online-first** (no offline engine); use realtime Firestore listeners.
- **Scale & weights are DATA** (per-criterion `max` + `weight`). Compute totals from config — never hardcode `/100` or `/80`.
- **Aggregation**: item average = (sum of submitting judges' totals) ÷ (number of judges who scored it). Every judge counts; ties left tied. **University winners = 6** (top per award category). **Stall winner scope is DEFERRED — do not build it.**
- **Auth**: email/password. **One admin who is also a judge** (same Auth UID holds both roles; their scores count). Judges may read items/criteria and read/write **only their own** score docs — enforce in Firestore rules.
- **Exports** reflect the **on-screen filter** (both tracks), including pending items.
- **iOS**: use `100dvh` (not `100vh`); call `navigator.storage.persist()`.

## Conventions
- Functional components + hooks; small files; typed Firestore models in `src/types`.
- Firebase config from `.env.local` (`VITE_FIREBASE_*`); **never commit keys**; provide `.env.example`.
- Accessible: labels, visible focus, keyboard nav; respect `prefers-reduced-motion`.
- Prefer minimal dependencies; justify any addition.
- Keep secrets, real data, and client spreadsheets out of git.

## Workflow (important)
- Implement **only the current phase** from `BUILD_PHASES.md`. Do **not** build future phases.
- If you need to deviate from the specs, **ask first**.
- After each phase: ensure `npm run build` and tests pass, **update `PROGRESS.md`** (done / decisions / follow-ups / open questions), then **stop for review**.

## Suggested layout
```
src/
  app/                 # routing, providers
  styles/tokens.css    # design tokens (JUDGE spec §9)
  components/          # shared UI (Button, Select, Toast, PhoneFrame, Card, Table, Pill, Medal, MetricCard, SliderRow, StatusBadge)
  lib/
    firebase.ts        # init (reads env)
    offline/           # persistence, reachability, sync loop, tombstones
    photos/            # capture, compress, IndexedDB outbox, upload queue
    export/            # xlsx + pdf
  types/               # Firestore models
  tracks/{stalls,universities}/   # per-track config (criteria source, filters, totals, labels)
  judge/               # judge app (signin, list, score)
  admin/               # admin app (shell, setup, results, exports)
```
