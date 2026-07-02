# Judge Apps — Development Specification

**Product:** Event Judging System — Judge-facing web apps
**Audience:** The engineer building the production system (you)
**Prepared from:** Working HTML/CSS/JS prototypes (`judge-app.html`, `judge-university.html`) + agreed requirements
**Status of prototypes:** UI/UX approved by client. Front-end look, flows, and interactions are locked. Backend, persistence, auth, and offline sync are NOT built yet — that's the job.

---

## 0. How to read this document

There are **two judge apps** that are ~90% the same app with a different data model:

1. **Judge · Stalls** (`judge-app.html`) — judges score exhibitor **stalls**.
2. **Judge · Universities** (`judge-university.html`) — judges score **university competition entries** across award categories.

They share one design system, one screen structure (Sign in → List → Score), and one set of interaction patterns (status tints, sliders, notes, photo capture, toast, dropdown filters). Build them as **one codebase with a "track" abstraction**, not two apps. Where they differ, this doc says so explicitly.

There is also an `admin-dashboard.html` prototype and an `index.html` landing page. The admin app is **out of scope for this spec** but is described briefly in §12 because the data model and results must serve it.

The prototypes are the source of truth for visuals. This document is the source of truth for behavior, data, and the production requirements the prototypes don't implement.

---

## Confirmed client decisions (latest round)

These override any conflicting "assumption" or "open question" text below.

1. **Scoring scale & weighting:** 0–10 per criterion, **equal weight**, **for now** — but the client expects this may change later at judges' request. **Therefore scale (`max`) and `weight` MUST be data-driven configuration, not hardcoded**, and totals must be computed from that config (see §6, §7.2, §8.2). Changing a criterion's max/weight or adding/removing criteria must be possible without a code change/redeploy.
2. **Assignment:** **Every judge scores every item** in a track. No per-judge subset assignment — do **not** build an assignment model. (A judge may use one or both apps; that's operational, not enforced in data.)
3. **Aggregation — CONFIRMED.** An item's final score = **average of judges' totals = (sum of all submitted judge totals for that item) ÷ (number of judges who scored it)**. **Every** judge's score counts (no drop-high/low). **Ties are left tied** (no tie-break). **University winners = 6**, one per award category — the entry with the highest average in that category. **Stall winner scope is DEFERRED** to a later phase: the system still computes and shows each stall's average and ranking now, but the official "winner" definition (one overall vs also per-hall / per-category) will be decided when the winner/awards feature is built.
4. **Judge auth:** **Email + password (Firebase Auth) for now.** A code/PIN login may be added later — design the auth layer so a second method can be added without reworking identity. `judgeId` = Firebase Auth UID.
5. **Edit after submit:** **Judges may edit their own marks after submitting.** A submitted score is not locked; re-opening a scored item loads its stored per-criterion values for editing, and re-submitting updates the same record.

---

## 1. What the prototypes are and are NOT

**They ARE:** static, single-file HTML pages with embedded CSS and vanilla JS. All state is in-memory JS objects. They demonstrate the exact intended UI, layout, copy, colors, and client-side interactions. They reset on refresh.

**They are NOT / do not include (you must build these):**

- Any backend, database, or network calls.
- Authentication (Sign in just calls `go('list')` — no validation).
- Real persistence (data is a JS array; refresh wipes it).
- **Offline-first storage and sync** — the single most important requirement (see §5).
- Photo upload or compression (photos are held as in-memory data URLs).
- Result aggregation, admin, or exports (export buttons in admin just show a toast).
- Judge→entry assignment logic (every judge currently sees every item).
- Sync-status indicators on scores (agreed but not yet in the prototype — see §5.6).

---

## 2. Users, roles, and the core job

- **Judge** — the only user of these two apps. Signs in on their own phone, works through a list of assignable items (stalls or university entries), scores each item against fixed criteria, optionally adds notes and up to 2 photos, and submits. Judges are typically **non-technical** and on a **venue floor with unreliable signal**.
- **Admin/Organizer** — sets up the event and reads results (separate app, §12).

**The core job of these apps:** let a judge score every assigned item quickly and reliably, **even with no internet for up to an hour**, and never lose a score to bad signal.

---

## 3. Target technology stack

Two forces drive every choice here: it must be **offline-first** and it must **run reliably on a judge's phone (especially iPhone)**. The stack below is the recommendation; the one genuinely swappable piece is the **frontend framework** (swap if the team is stronger elsewhere) — everything else should hold.

### 3.1 Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** | Typed data model (criteria, scores, sync states) prevents whole classes of bugs |
| Framework | **React 18** (function components + hooks) | Ubiquitous, easy for most devs and for AI-assisted coding; the two tracks share components cleanly |
| Build / dev | **Vite** | Fast dev server, first-class TS + PWA support |
| **Offline app shell / PWA** | **`vite-plugin-pwa` (Workbox)** | Installable PWA; service worker **precaches the app shell + assets so the app loads with no network**. Installing to the iPhone home screen also makes JS run reliably (sidesteps the iOS "preview doesn't run JS" trap). |
| Routing | **React Router** | The 3 views + proper hardware/browser back-button behavior |
| Local UI state | **React Context + hooks** (add **Zustand** only if needed) | Current judge, sync status. Keep light — Firestore listeners drive the actual data |
| Styling | **Plain CSS with the existing design tokens** (CSS custom properties) via **CSS Modules** per component | Preserves the approved design exactly, no framework lock-in. (Tailwind is fine if the team prefers, but tokens in §9 are already CSS vars.) |
| Fonts | **Self-hosted Fraunces + Inter** (`@fontsource/fraunces`, `@fontsource/inter`) | **Must render offline** — the Google Fonts CDN link in the prototype won't load with no signal. Self-host and let the service worker cache them. |
| Backend | **Firebase** — Firestore, Cloud Storage, Auth (email/password), Hosting | Per client. Firestore **offline persistence (multi-tab)** is the core of the sync engine (§5). |
| Local blob store | **IndexedDB via `idb`** (Jake Archibald's tiny wrapper) | The photo outbox — holds compressed blobs until upload (§5.3b) |
| Image compression | **`browser-image-compression`** | Resize longest edge ~1280px / JPEG ~0.7; handles EXIF orientation (§5.2) |
| Cloud Functions (later) | **Firebase Functions** | Future needs: mint custom tokens if PIN login is added, server-side Excel/PDF export, scheduled/derived aggregations |
| Testing | **Vitest + React Testing Library**; **Playwright** for e2e | Playwright must cover the **offline drill**: score with network throttled/airplane mode for ~an hour, then reconnect and assert everything syncs once, no dupes |
| Tooling | **ESLint + Prettier**, **Node LTS**, npm or pnpm | Standard hygiene; TS strict mode on |

### 3.2 Firebase specifics

- **Cloud Firestore** — structured data (events, items, criteria, scores). Enable **offline persistence**; gate its network with `enableNetwork()`/`disableNetwork()` per §5.3a.
- **Cloud Storage for Firebase** — photos, uploaded from the IndexedDB outbox via **resumable uploads** (§5.3b).
- **Firebase Auth** — email/password now (§11).
- **Firebase Hosting** — serves the PWA over https (required for service workers and for the app to run at all on iOS).
- **Security rules** — a judge may read the items/criteria for the event and read/write **only their own** score docs (`{judgeId}_{itemId}` where `judgeId == request.auth.uid`); notes/photos likewise scoped. Write these rules; don't leave the DB open.

### 3.3 Local device storage

- **IndexedDB** for both the Firestore doc cache (managed by the SDK) and a **separate `photoOutbox` object store** for compressed blobs.
- Call `navigator.storage.persist()` on startup so the browser doesn't evict local data under pressure (matters on iOS).
- Do **not** use `localStorage` for anything but trivial flags — ~5 MB, text-only; photos will blow past it.

### 3.4 Why not simpler / alternatives

- **Vanilla JS** (like the prototype) is viable and lightest, but a typed component model pays off across two tracks, a sync state machine, and a photo queue. If the 2-dev team strongly prefers vanilla or **Svelte/Vue**, swap the framework row — the Firebase + offline + libs design is unchanged.
- Firestore's built-in offline cache is why we're **not hand-rolling a local SQL database**; we lean on it for docs and only hand-manage the photo blobs it can't hold.

---

## 4. Information architecture / screens

Both apps have exactly **three screens** ("views"), swapped client-side (SPA, no full navigation):

1. **Sign in** (`#signin`)
2. **List** (`#list`) — the judge's work queue
3. **Score** (`#score`) — scoring one item

Navigation in the prototype is `go(view)` which toggles a `.active` class on `.view` sections. Back button on Score returns to List. There is no browser-history integration in the prototype — **you should add proper routing/back-button handling** so the hardware/browser back button behaves (see §10).

---

## 5. Offline-first architecture (MANDATORY — the defining requirement)

This is the heart of the build. The client's words: *"cache data should be saved locally (in places where signal strength is low), and uploaded to the database once there is a stable internet connection. Otherwise, data should be able to directly read, write, or delete from the records."*

### 5.1 Agreed behavior

- **Write-local-first, sync-on-interval.** Every create/edit/delete of a score commits to the **local store instantly** and the UI confirms immediately. The judge NEVER waits on the network. A background loop flushes to Firebase only during a **stable** connection window. (Client explicitly chose this over live/immediate writes.)
- **Max offline duration to support:** **up to 1 hour** continuously. Worst case a judge scores ~40–60 items with photos in that window; the device must hold all of it safely and upload when signal returns.
- **Reads/writes/deletes go through normally when online and stable**; when offline they operate purely against the local cache.

### 5.2 Storage budget & why photo compression is non-negotiable

- Score docs are tiny JSON (a few hundred bytes each). An hour of them is trivial.
- **Photos are the whole risk.** Raw phone photos are ~2–4 MB each; 60 items × 2 photos ≈ 300–400 MB — too large for low-end phones and far too slow to upload on returning signal.
- **Requirement:** compress every photo **on capture, client-side**, before storing. Target: resize longest edge to **~1280px**, encode **JPEG quality ~0.7**, yielding **~250–350 KB** each. That turns the worst hour into ~35 MB, which sits comfortably in IndexedDB. (Use a canvas-based resize or a small lib like `browser-image-compression`.)
- Call `navigator.storage.persist()` on startup so the browser doesn't evict local data under storage pressure (important on iOS).

### 5.3 The two sync paths

**(a) Score documents → Firestore with offline persistence enabled.**
Firestore already does "write locally, sync when connected." We want to *gate* its syncing so it only flushes during stable windows (not mid-fade on weak signal). Do this by toggling Firestore's network: keep it disabled by default and call the enable path only when the reachability check (5.4) reports stable; drop back to disabled on instability. (Firestore SDK: `disableNetwork()` / `enableNetwork()`.) Score writes still land in the local cache instantly while the network is disabled.

**(b) Photos → separate IndexedDB "outbox" + Cloud Storage upload queue.**
Firestore does not store binaries. So:
1. On capture, compress → store the blob in an IndexedDB `photoOutbox` keyed by a client-generated photo id, linked to its score id.
2. On each stable interval tick, resumable-upload queued blobs to Cloud Storage.
3. On success, write the resulting download URL onto the score doc's `photos[]` and delete the local blob.
4. Photo upload must be independent of score sync — a slow photo upload must never block score docs from syncing.

### 5.4 "Stable connection" detection (don't trust `navigator.onLine`)

`navigator.onLine` flaps and lies on weak signal. Implement an explicit reachability check:

- A lightweight ping (small request to your backend/health endpoint) with a short timeout.
- Consider the connection **stable** only after **~2 consecutive successful pings** with acceptable latency; consider it **unstable** after ~2 consecutive failures/timeouts.
- Only when stable do you enable Firestore network + run the photo upload queue. Use retry with backoff.

### 5.5 Records, IDs, conflicts, deletes

- **One score record per (judge × item).** A judge only ever writes their own scores on their own device, so real conflicts are near-zero.
- **Deterministic doc IDs:** `${judgeId}_${itemId}` so re-syncs are idempotent and a re-submit updates the same doc.
- **`updatedAt` timestamp** on every write → **last-write-wins** per record if the same record is ever touched twice.
- **Soft-delete tombstones:** deletes set a `deleted: true` flag (not a hard delete) so an offline delete isn't resurrected by a stale sync. Hard-delete/cleanup, if any, happens server-side later.

### 5.6 Sync-status UI (agreed; ADD to the apps)

Non-technical judges must *trust* that offline work is safe. Every score (in the list and after submit) shows a small status badge with these states:

`Saved on device → Queued → Uploading → Synced` (plus an error/retry state).

- **Saved on device:** committed locally, not yet sent.
- **Queued:** waiting for a stable window.
- **Uploading:** currently syncing (esp. photos).
- **Synced:** confirmed in Firebase.
- **Retry/error:** last attempt failed; will retry automatically; allow manual retry.

Style it consistent with the existing status pills (see design system). This is the one new UI element not in the current prototype — design it to match.

### 5.7 Agreed default parameters (client to confirm, see Open Questions)

| Parameter | Default |
|---|---|
| Sync interval (while stable) | ~20 seconds |
| Stability threshold | 2 consecutive good pings to go online; 2 failures to go offline |
| Photo compression | longest edge ~1280px, JPEG ~0.7 (~300 KB) |
| Max photos per item | 2 (hard limit, enforced in UI + logic) |
| Persistent storage | request `navigator.storage.persist()` |
| Max offline window to support | 60 minutes |

---

## 6. Data model (proposed — confirm & refine)

The prototypes use flat in-memory arrays. Below is a proposed Firestore shape that supports both tracks, the admin, and results. Adjust as you see fit, but keep the (judge × item) score-record rule from §5.5.

### 6.1 Shared / event

```
events/{eventId}
  name: string                       // "Annual food & craft expo 2026"
  year: number
  activeTrack flags, dates, etc.

judges/{judgeId}                     // judgeId = Firebase Auth UID
  displayName: string                // "Priya N."  (shown as "Hi, {firstName}")
  email: string                      // Firebase Auth email login
  // NO assignment fields — every judge scores every item (confirmed).
  // (Future optional: a `pin`/code method may be added; keep auth behind a service.)
```

### 6.2 Stalls track

```
halls/{hallId}         { eventId, name }           // Lobby, Hall A, Hall B, Between A & B, Hall C, Hall D, Hall E, Outside, University
stallCategories/{id}   { eventId, name }           // Food, Packaging, Machinery, Services … (SEE OPEN Q — source sheet has this column EMPTY)
stallCriteria/{id}     { eventId, name, order, max:10, weight:1 }   // 10 criteria, see §7.2
stalls/{stallId}
  eventId, hallId, categoryId (nullable)
  stallNo: string                    // "A1, A2"  (can be multiple / can be empty)
  organization: string               // "Aussee Oats Milling (Pvt) Ltd"
  imageUrl: string (nullable)
```

### 6.3 Universities track

```
universities/{uniId}   { eventId, name }           // 11 universities, §8.1
awardCategories/{id}
  eventId
  name: string                       // "Most Innovative Product"
  type: 'product' | 'process'        // controls which criteria set applies (§8.2)
  order: number
universityCriteria: two fixed sets by type (§8.2) — can be config or hardcoded
entries/{entryId}                    // one university's submission in one award category
  eventId, universityId, awardCategoryId
  type: 'product' | 'process'        // denormalized from category for convenience
  name: string                       // product/process name, e.g. "Jackfruit protein bar"
  imageUrl (nullable)
```

### 6.4 Scores (both tracks) — the critical collection

```
scores/{judgeId}_{itemId}            // deterministic id; itemId = stallId or entryId
  eventId
  track: 'stalls' | 'universities'
  judgeId
  itemId
  itemType: 'stall' | 'entry'
  criteria: { [criterionKey]: number }   // per-criterion 0–10 (see scale open Q)
  total: number                          // sum (stalls /100, entries /80) — or computed
  notes: string
  photos: [ { url, storagePath, w, h } ]  // filled after Cloud Storage upload
  status: 'draft' | 'submitted'
  deleted: boolean                        // tombstone
  createdAt, updatedAt                    // server + client timestamps
```

Local mirror lives in Firestore's offline cache; photo blobs live in a separate IndexedDB `photoOutbox` until uploaded.

---

## 7. Judge · Stalls — detailed spec

### 7.1 Screens & behavior

**Sign in (`#signin`)**
- Branding: gold rosette "✦", title "Stall judging", subtitle "Annual food & craft expo · 2026" (event name from data).
- Fields: "Judge name or code" (text, e.g. `JUDGE-07`), "PIN" (password). Prototype pre-fills `JUDGE-07` / `1234` for demo — remove for production.
- Button: "Sign in" (gold). Hint text below: "Use the code and PIN printed on your judge card."
- **Production:** validate against Firebase Auth / judge record (§11). On success go to List and load that judge's assigned items.

**List (`#list`)**
- Header: greeting `Hi, {firstName}` + **teal "Stalls" app badge** (so the judge knows which app), event name beneath.
- **Progress:** `{done} / {total} scored` (Fraunces numerals) + a gold progress bar (`done/total`).
- **Filters:** two native `<select>` dropdowns — **Hall** and **Category** — each defaulting to "All …", built dynamically from the data. Selecting a value filters the list and the control turns gold ("on"). On the stalls app the two selects sit side-by-side and wrap on very narrow screens.
- **List rows** (one per stall), each a tap target opening Score:
  - thumbnail (stall image; placeholder ▦ if none),
  - **organization name** (bold),
  - meta line `{stallNo} · {hall}` (stallNo omitted if empty),
  - status on the right.
- **Status tint (important):** each row is tinted by completion — **faint green** (`--green-soft`, border `#CBE3D5`) when scored, showing the score number + green dot; **faint red** (`--red-soft`, border `#EFD2CB`) when pending, showing a red dot + "Pending". This lets a judge scan what's left at a glance. (In production, extend the status to reflect sync state per §5.6.)

**Score (`#score`)**
- Top bar: back arrow (→ List), stall organization name (title), meta `{stallNo} · {hall}`.
- Hero image band (stall photo or placeholder ▦) with a small caption chip showing the meta.
- **Criteria:** the 10 stall criteria (§7.2), each rendered as a row: label + current value `n / 10` (Fraunces) + a **0–10 range slider** (step 1) + a `0 · 5 · 10` scale. Changing a slider updates that criterion's number and the running total live.
- **Notes:** optional textarea, placeholder "Add any notes…". (Label was recently changed from "Comment" to **"Notes"**.)
- **Photos:** "Photos (optional)", counter `n / 2`. Two slots in a 2-col grid; each empty slot is a dashed "＋ Add photo" button; tapping opens the file picker with `capture="environment"` (rear camera on phones). A filled slot shows the image with a "✕" remove button. After 2 photos the add-slot disappears; a 3rd is rejected with a toast. **Production must compress on capture (§5.2) and queue upload (§5.3).**
- **Footer (sticky):** "Total" `{sum} / 100` (Fraunces) + gold "Submit score" button.
- **Submit:** marks the item done, stores total, shows a confirmation toast (`{name} scored — {total}/100 · {n} photos`), returns to List after ~600 ms. **Production:** this is a local-first write (§5) — commit locally, confirm instantly, sync later; set score status accordingly.
- **Edit after submit (confirmed):** scored items are **not locked**. Tapping a green/scored row re-opens Score with the judge's **stored per-criterion values** pre-loaded (the prototype approximates this by seeding sliders from the total ÷ criteria count — production must load the actual saved values). Re-submitting updates the **same** score record (`{judgeId}_{itemId}`), bumps `updatedAt`, and re-enters the sync flow (status → Saved on device → … → Synced).

### 7.2 Stall criteria (10) & scoring

Exact criteria (from the client's marksheet), in order:

1. Stall outlook
2. Innovative thinking
3. Eye-catching promotional / LED
4. Product information
5. Catalogue
6. Sampling
7. Marketing approach
8. Stall staff
9. Attire of staff
10. Tech-driven

- **Scale (confirmed for now, must be configurable):** each criterion **0–10**, integer, **equal weight** → **total out of 100** with the current config. Store `max` and `weight` per criterion in Firestore; compute total as the weighted sum so scale/weights (or the criteria list itself) can change later without a redeploy. Do **not** hardcode "100".
- Total = weighted sum of the criteria (currently a plain sum of 10 × 0–10).

### 7.3 Stall data specifics

- The real source sheet has **226 stalls** across **9 location groups**: Lobby, Hall A, Hall B, Between A & B, Hall C, Hall D, Hall E, Outside, University. (The prototype ships **10 dummy stalls** to keep the file small; the shape is identical.)
- A stall's **stall number** can list multiple bays ("A1, A2") or be empty.
- The sheet's **Category column is empty** — categories are intended but not yet assigned. The prototype uses dummy categories (Food/Packaging/Machinery/Services) so the category filter is demonstrable. **See Open Q — decide whether stalls have categories and what they are.**
- The "University" location group here is 11 **university stalls** judged on the same 10 stall criteria — this is *separate from* the University awards track in §8. Keep them straight.

---

## 8. Judge · Universities — detailed spec

Structurally identical to Stalls (Sign in → List → Score, same components, same design), with a different data model and a criteria set that changes by category type.

### 8.1 Universities (11)

Aquinas College, Sri Jayewardenepura, Rajarata University, Vocational Technology, Uva Wellassa, Wayamba, Sabaragamuwa, Ruhuna, Open University, Peradeniya, University College of Matara.

### 8.2 Award categories (6) & criteria (8)

A judged item is one **entry** = a university's submission in one award category, with a **product/process name**.

Award categories and their type:

| Category | Type |
|---|---|
| Most Innovative Product | product |
| Most Innovative Process | process |
| Most Commercially Viable Product | product |
| Most Commercially Viable Process | process |
| Best Green Innovation | product |
| Best Innovation that Promotes Food Safety | product |

**8 criteria per entry.** The first two depend on `type`; the last six are shared:

- **Product type:** Supply chain, Production, Viability, Packaging, Hygiene, Presentation, Knowledge, Marketability
- **Process type:** Technology, Finish, Viability, Packaging, Hygiene, Presentation, Knowledge, Marketability

- **Scale (confirmed for now, must be configurable):** each criterion **0–10**, integer, **equal weight** → **total out of 80** with the current config. Same rule as stalls: store `max`/`weight` as data and compute totals from config; don't hardcode "80".
- Green Innovation and Food Safety are treated as **product-type** (Supply chain/Production) because that's how the source sheet lays them out. *Confirm (Open Q3).*

### 8.3 Screens & differences from Stalls

- **App badge:** **violet "Universities"** (vs teal "Stalls").
- **List filters:** two dropdowns — **Award category** (the 6 above; option value = category id) and **University** (the 11). On the universities app these two selects are **stacked full-width** (long award names don't fit side-by-side).
- **List rows:** title = **university name**; meta = `{entryName} · {awardCategory}`; thumbnail glyph is **⚙ for process** entries, **▦ for product** entries.
- **Score screen:** title = university; sub = award category name; hero caption = "Product entry" / "Process entry"; an **Entry block** (gold, highlighted) shows an uppercase `Entry` label with a **Product/Process chip** and the entry's product/process name in Fraunces. Then the 8 criteria (the correct set for the entry's type), notes, photos — all identical mechanics to Stalls.
- **Footer total:** `{sum} / 80`.
- **Submit toast:** `{university} scored — {total}/80 · {n} photos`.

### 8.4 University data specifics

- Prototype ships **14 dummy entries** across the 6 categories and various universities (8 scored, 6 pending) to exercise both filters and both criteria variants. Replace with real entries.
- Not every university enters every category. *Confirm how entrants are determined — see Open Q.*

---

## 9. Design system (exact values — match precisely)

### 9.1 Color tokens (CSS custom properties)

```
--ink:        #1C2532   /* primary text / structural dark */
--ink-soft:   #54606F
--ink-faint:  #8A95A1
--paper:      #F4F0E8   /* app background (warm off-white) */
--surface:    #FFFFFF   /* cards / frames */
--line:       rgba(28,37,50,.10)
--line-strong:rgba(28,37,50,.16)
--gold:       #B07D24   /* primary accent: buttons, active filters, sliders, ranks */
--gold-deep:  #7E5810
--gold-soft:  #F3E7CC
--gold-line:  #E4CE9E
--green:      #2F7D5B   --green-soft:#E4F0E9   /* scored/done */
--red:        #C0492F   --red-soft:  #F8E7E3   /* pending */
```
App badges (distinct per app):
- Stalls: bg `#DCEFEA`, text `#1E7F6B`, border `#BFE2D8` (teal)
- Universities: bg `#ECE3F6`, text `#6D4AA6`, border `#DBC9EF` (violet)

Button text color: `#F6F3EC`. Toast bg `--ink`, check icon `#E9C977`.

### 9.2 Typography

- **Display** (headings, all score numbers, ranks): **Fraunces** (Google Fonts), weights 400/500/600, `opsz 9..144`. Numbers set in Fraunces is a deliberate signature ("scores look like awards").
- **Body / UI:** **Inter**, weights 400/450/500/600.
- Load via Google Fonts `<link>` (already in the files).

### 9.3 Shape, spacing, motion

- Radii: inputs/buttons ~13px, list rows 15px, hero 16px, phone frame 30px, pills 99px.
- Sliders: 6px track (`--paper`), 24px round gold thumb with 3px white ring.
- Transitions ~.15s; button active `scale(.985)`; toast slides up with `cubic-bezier(.2,.8,.2,1)`.
- Respect `prefers-reduced-motion` (already handled: disables transitions).

### 9.4 Layout / frame

- Content is centered in a **"phone frame"**: `max-width:392px`, `height:792px`, capped at `calc(100dvh - 48px)`, `overflow:hidden`, column flex.
- **Mobile (≤440px):** the frame goes full-bleed — `height:100dvh`, no max-width, no border/radius/shadow — so it fills the device.
- Background: paper with a subtle dotted radial-gradient texture.

---

## 10. Cross-cutting / non-functional requirements

- **Mobile-first & responsive:** primary target is a judge's phone in portrait; must also work on tablet/desktop.
- **iOS specifics (learned the hard way):**
  - Use **`100dvh`**, not `100vh`, or the sign-in button gets clipped under Safari's toolbar.
  - Opening a raw `.html` via iOS Quick Look/preview **does not run JS** — the app must be served over http(s) (Firebase Hosting) to work on iPhone. Document this for the client.
- **Routing / back button:** add real SPA routing (or history state) so the device back button moves Score→List rather than leaving the app.
- **Accessibility:** inputs have `<label>`s and dropdowns have `aria-label`s in the prototype — preserve and extend (focus states are defined; keep them). Ensure slider values are announced.
- **Performance:** keep it light; lazy-load nothing heavy on the judge path; the whole judge flow must be usable on a low-end Android over a bad connection.
- **Internationalization:** currently English only; content is Sri Lankan (LKR, local org/university names). Not a stated requirement, but keep copy in one place in case.
- **Two "tracks" from one codebase:** abstract the item model (stall vs entry), the criteria source (fixed 10 vs type-dependent 8), the totals denominator (100 vs 80), the filter set (Hall+Category vs Award+University), and the badge — everything else is shared.

---

## 11. Authentication (judge sign-in)

**Confirmed:** use **Firebase Auth email + password** for now. Admin creates each judge with an email + password (or the judge sets a password via invite/reset). The signed-in **Firebase Auth UID is the `judgeId`** on every score record.

- The prototype's "code + PIN" sign-in screen stays visually, but the two fields become **email** and **password**, validated against Firebase Auth. Remove the demo pre-filled values.
- **Design for a future second method:** a code/PIN login may be added later (simpler for on-the-floor, non-technical judges). Keep identity resolution behind a thin auth service so adding a PIN path (e.g. custom token minted by a Cloud Function) does not require reworking how `judgeId` flows into scores.
- Because **every judge scores everything** (no assignment), auth only establishes *who* is scoring, not *what* they may score.
- Standard Firebase Auth persistence keeps the judge signed in across app reloads and offline periods — verify the session survives an offline hour (it should; tokens refresh on reconnect).

---

## 12. Admin, results & exports (context only — not in these two apps)

For the data model to be right, know where scores flow:

- Admin sets up halls/categories/criteria/stalls and universities/award-categories/entries, and manages judges.
- **Results:** each item's final score = **average of judges' totals = (sum of submitted judge totals) ÷ (number of judges who scored that item)**; every judge counts; ties left tied. **University results: 6 winners**, one per award category (highest average in the category). **Stall winner definition is deferred** — for now compute and show each stall's average and ranking, but the official winner scope (overall vs per-hall/per-category) is not yet decided.
- **Exports:** Excel (.xlsx) and PDF of results (currently a stubbed toast in the admin prototype). Build server-side or client-side later.
- Admin filtering/sorting by hall & category already exists in the admin prototype; results show a "Pending" state for not-yet-scored items and push them below ranked ones.

---

## 13. Assumptions baked into the prototypes (flagged for confirmation)

1. **Scale = 0–10 per criterion, equal weight — CONFIRMED for now, but must be configurable** (data-driven `max`/`weight`; may change at judges' request later). Stalls total /100, entries total /80 *given the current config*; compute totals from config, not hardcoded denominators.
2. **All judges see all items — CONFIRMED.** No per-judge assignment.
3. **Aggregation = average of judge totals** (recommended default, §3 of Confirmed Decisions; final confirmation pending).
4. **Stall categories are dummy** (Food/Packaging/Machinery/Services) because the source column is empty. *(Still open — Q6.)*
5. **Green Innovation & Food Safety = product-type** criteria. *(Confirm — Q5b.)*
6. **Single event** at a time. *(Still open — Q4.)*
7. **Sign-in = email + password (Firebase Auth) — CONFIRMED.** PIN option later.
8. **Edit after submit allowed — CONFIRMED.** Scores are editable, not locked.
9. Photos held as in-memory data URLs in the prototype (no compression/upload) — production must implement §5.2–§5.3.

---

## 14. OPEN QUESTIONS (please answer before/at kickoff)

RESOLVED (see Confirmed Decisions at top): scale/weighting (configurable, 0–10 equal for now), assignment (everyone scores everything), auth (email+password now), edit-after-submit (allowed), **aggregation** (average = sum ÷ number of judges who scored the item; every judge counts; ties left tied), **university winners** (6, one per award category).

**Deferred to a later phase (not needed to build the judge apps)**
1. **Stall winner scope** — one overall ranking vs also winners per hall / per category. Client will decide when the winner/awards feature is built. Per-item averages and ranking are still computed now; only the stall "winner" definition is deferred.

**Still open — items/scope**
2. University: confirm **Green Innovation & Food Safety use the *product* criteria** (Supply chain/Production), not process.
3. **One event at a time**, or must the system hold **multiple events** concurrently? (Affects whether everything is scoped under `events/{eventId}`.)
4. University entrants: does **every university enter every category**, or only where they submitted? How is the entry list determined/loaded?
5. **Stall categories:** do stalls need a category dimension at all, and if so what are the real categories? (Source sheet column is empty; prototype uses dummy values.)

**Still open — offline params (defaults in §5.7)**
6. Confirm sync interval (~20s), stability threshold (2 good/2 bad pings), photo compression target (~1280px/0.7). The 60-minute offline window and write-local-first/sync-on-interval model are already confirmed.

**Still open — photos/data**
7. Should photos be visible to the **admin** (thumbnail per item/score)? Any per-judge photo review needed?
8. Any data **retention / privacy** constraints on judge notes and photos?

---

## 15. Suggested build order (milestones)

1. **Foundation:** project scaffold, Firebase project, Hosting, design-system tokens/components ported from the prototype (frame, buttons, inputs, sliders, list rows, status pills, dropdowns, toast).
2. **Data model + admin-lite seeding:** Firestore collections (§6), seed real stalls/universities/criteria (from the client's spreadsheets).
3. **Auth:** judge sign-in per §11; load assignments.
4. **Stalls judge app:** List (filters, tints, progress) + Score (criteria, notes, total) writing to Firestore — online only first.
5. **Universities judge app:** reuse via the track abstraction; award/university filters, product/process criteria, entry block, /80 total.
6. **Offline core:** Firestore offline persistence + stable-connection detector + interval flush gating (§5.3a, §5.4); local-first writes; tombstones; deterministic IDs.
7. **Photos:** capture → compress → IndexedDB outbox → Cloud Storage upload queue → URL on score doc (§5.2–5.3b).
8. **Sync-status UI** (§5.6) on list rows and after submit.
9. **Hardening:** iOS `dvh`, routing/back button, `storage.persist()`, reduced-motion, low-end-device testing, bad-network testing (throttle, airplane-mode-for-an-hour drill).
10. Results/admin/export (separate track).

---

## 16. Acceptance criteria (judge apps)

- A judge can sign in with **email + password** (Firebase Auth) and sees **all items** in the track; the session survives an offline hour.
- A judge can **edit and re-submit** a previously submitted score; the same record updates and re-syncs (no duplicate).
- **Totals and scale are computed from criterion config** (`max`/`weight`); changing config changes totals without a code change.
- Scoring works **fully offline**; scores and photos persist across app reloads and device sleep for at least 60 minutes with no connection.
- On regaining a **stable** connection, all queued scores and (compressed) photos upload automatically, with visible status transitioning to **Synced**; nothing is lost or duplicated (idempotent by `{judgeId}_{itemId}`).
- Sync never fires during a flapping/weak signal in a way that corrupts or half-writes a record.
- Both tracks match the approved visual prototypes pixel-close (tokens in §9), including the green/red status tints, the per-app color badge, sliders, notes, and up-to-2-photo capture.
- Works on current iOS Safari and Android Chrome, mobile portrait first; the sign-in button is never clipped on iPhone.

---

## 17. Appendix — prototype file inventory

| File | Purpose |
|---|---|
| `judge-app.html` | Judge · Stalls prototype (source of truth for that UI) |
| `judge-university.html` | Judge · Universities prototype |
| `admin-dashboard.html` | Admin/results prototype (context; separate build) |
| `index.html` | Demo landing page linking the three (relative links; needs co-hosting) |

Reference the two judge HTML files directly for exact markup, class names, and the vanilla-JS reference implementations of: `go()` (view switching), `renderList()` (list + tints + progress), `fillFilters()`/`setFilter()` (dropdowns), `openScore()` (criteria rendering), `setVal()`/`recalc()` (live totals), `renderPhotos()`/`addPhoto()`/`removePhoto()` (photo capture, 2-max), and `toast()`.

*End of specification.*
