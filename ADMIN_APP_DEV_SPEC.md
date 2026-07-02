# Admin / Results App — Development Specification

**Product:** Event Judging System — Organizer-facing admin & results app
**Audience:** The engineer building the production system (you)
**Companion to:** `JUDGE_APPS_DEV_SPEC.md` — read that first. This document assumes it and only repeats admin-specific detail. Shared design tokens, the data model, Firebase setup, and confirmed client decisions live there and are **not** duplicated here except where the admin adds to them.
**Prepared from:** the `admin-dashboard.html` prototype + agreed requirements.
**Status of prototype:** the **stall-track** admin UI (Results, Stalls, Criteria, Judges, Halls) is built and visually approved. The **university-track** admin/results is **not** prototyped — it's specified here as an extension that must match the same design and patterns.

---

## Inherited from the judge spec (do not re-decide)

- **Design system** (colors, fonts, radii, motion) — `JUDGE_APPS_DEV_SPEC.md` §9. The admin uses the same tokens plus a few additions (§9 below).
- **Data model** — judge spec §6. The admin is the **writer** of the setup collections (events, halls, categories, criteria, stalls, universities, award categories, entries, judges) and the **reader/aggregator** of `scores`.
- **Tech stack** — judge spec §3 (React + TS + Vite + Firebase). Admin differences in §3 below.
- **Confirmed decisions** — judge spec top block. The ones that shape this app:
  - **Aggregation:** item final score = **(sum of all submitting judges' totals) ÷ (number of judges who scored that item)**. Every judge counts; ties left tied.
  - **University winners = 6** (one per award category, highest average). **Stall winner scope is DEFERRED** (compute/show averages & ranking now; "official winner" later).
  - **Scale/weighting is configurable** (per-criterion `max` + `weight`, data-driven). The **Criteria screen is where that config is edited** — see §7.2.
  - **Every judge scores everything** (no assignment). This corrects the prototype's Judges screen (§11).
  - **Judge auth = email/password**; **admin auth** also email/password with an admin role (§2).

---

## 1. What the admin prototype is and is NOT

**IS:** a static single-file HTML page (`admin-dashboard.html`), desktop-first, sidebar + content panels toggled client-side. All data is an in-memory `STALLS` array (10 dummy stalls). Demonstrates the exact intended admin UI for the stall track.

**Is NOT / must be built:**
- Any backend, real data, or auth.
- **The university track entirely** (universities, award categories, entries, per-category results, the 6 winners).
- **Add/edit forms** — every "Add …" button is a stubbed toast; no forms exist yet.
- **Real results math** — averages are hardcoded in dummy data; production must compute from `scores`.
- **Working exports** — Export Excel/PDF buttons only show a toast.
- **Image upload** for stalls/entries.
- **Real-time updates** as judges sync.
- **Mobile navigation** — the sidebar simply hides under 760px with no replacement.
- **Reorder/drag** on criteria (the drag handle is decorative).

---

## 2. Users, auth & roles

- **User (CONFIRMED):** a **single Admin/Organizer** who is **also a judge**. One admin; no multiple-admin or permission-tier model. The same person uses the judge app(s) to score and the admin app to set up and read results.
- **Auth:** Firebase Auth **email + password**, same provider as judges. The admin's account carries **both** capabilities — an **admin** role/claim (gates the admin app) **and** a judge identity (their `judgeId` = the same Auth UID, so their scores count like any judge's). Judge apps and the admin app are separate surfaces sharing one login.
- **Security rules:** the admin can read everything and write setup collections; judges (including the admin acting as a judge) read items/criteria and read/write only their own `{judgeId}_{itemId}` score docs; non-admins cannot reach admin data. Enforce server-side.
- **The admin counts as a judge in results:** they appear in the Judges list and their submitted scores are included in every item's average and "judges in" count.

---

## 3. Tech stack (admin-specific notes)

Same stack as the judge apps (judge spec §3). Differences:

- **Online-first, NOT offline-first.** Admins work from an office/desk with a connection; the offline engine (judge spec §5) is a **judge** requirement and is **out of scope** for the admin app. You may still enable Firestore persistence for resilience, but no sync-status machinery, photo outbox, or stable-connection gating is needed here.
- **Real-time:** use Firestore realtime listeners so the leaderboard and progress update **live as judges' scores sync in**. (Because judges sync on an interval / after offline windows, admin results naturally lag by that amount — expected, not a bug.)
- **Exports:** two viable approaches — pick one:
  - **Client-side:** **SheetJS (`xlsx`)** for `.xlsx`, **`pdfmake`** (or jsPDF + autotable) for PDF. Simple, no server. Good for MVP.
  - **Server-side Cloud Function:** generates and returns the file. Better for large/branded official reports and keeps logic off the client. Recommended if reports get elaborate.
- **Aggregation** can be **computed client-side** by reading all `scores` for the event (hundreds of docs — trivial) and reducing in memory. Optionally maintain derived aggregates via **Cloud Function triggers** if you want O(1) reads at scale or server-authoritative results. MVP: client-side reduce.

---

## 4. Information architecture / navigation

**Layout:** fixed left **sidebar (rail, 230px)** + scrollable **main** area with **panels** swapped client-side (`data-p` → toggles `.panel.on`). Prototype panels (stall track):

- **Results** (default) · **Stalls** · **Criteria** · **Judges** · **Halls & categories**

**Production must add the university track.** Recommended structure — a **track context** for the whole admin (Stalls | Universities), OR two grouped nav sections. Full nav:

```
STALLS         Results · Stalls · Criteria · Judges · Halls & categories
UNIVERSITIES   Results (per award category) · Winners · Entries · Universities · Award categories · Criteria
EVENT          Event settings (name/year), Admins, Export
```

(Judges are shared across tracks — one Judges screen is fine; a judge can score in either app.)

**Sidebar:** brand mark ✦ + event name; nav; footer shows the signed-in admin (avatar initials, name, role). Active item highlighted (white bg, gold icon).

**Mobile:** the prototype hides the rail under 760px — production needs a **hamburger/drawer** nav. Admin is desktop-first but must not be unusable on a tablet/phone.

---

## 5. Data the admin owns (writes) & reads

Writes (setup — see judge spec §6 for field shapes): `events`, `halls`, `stallCategories`, `stallCriteria`, `stalls` (+ image → Cloud Storage), `universities`, `awardCategories`, `universityCriteria` (config), `entries` (+ image), `judges` (create/invite Auth users).

Reads/aggregates: `scores` (all, per event) → computes item averages, ranking, progress, winners.

---

## 6. Results & aggregation

### 6.1 Stall results (Leaderboard) — from prototype, make real

**Metric cards (top):** Stalls (count), Judges (count), Scored (% of items with ≥1 score), Avg score (mean of item averages, `/100` with current config). In the prototype these compute from dummy data in `updateMetrics()`; production computes from real items + scores.

**Leaderboard card:**
- **Toolbar:** Hall filter, Category filter, Sort (Rank avg high→low [default], Avg low→high, Name A–Z, Hall). Options built dynamically from data; **Category select disabled when no categories exist** (matches judge-side reality — source sheet has none yet).
- **Table columns:** Stall (rank medal + organization name), Hall, Category, **Avg**, **Judges in**.
- **Ranking:** by **average** (§ aggregation) descending. **Top 3 get a gold medal**; others a plain numbered medal.
- **Average = (sum of that stall's submitted judge totals) ÷ (number of judges who scored it)**, shown to 1 decimal. This "number of judges who scored it" is the **"Judges in"** value (`jin`).
- **Judges in** pill: green "full" when `jin == totalJudges`, amber "part" otherwise.
- **Pending state:** stalls with **no scores yet** show rank "–", Avg "—", and a grey **"Pending"** pill, and sort **below** all scored stalls. (Prototype implements exactly this in `renderResults()`.)
- **Empty state:** "No stalls match these filters."

**Live:** subscribe to `scores`; recompute averages/ranking as they arrive.

### 6.2 University results (per award category) — NEW, not prototyped

Build to mirror the stall Results visually, but **one leaderboard per award category** (6). For each category:
- List its **entries** (university + product/process name), ranked by **average** (same formula).
- Same medal / pending / Judges-in treatment.
- Filter/sort within a category; a category selector switches which award you're viewing (or show all six as stacked cards/sections).

**Winners view (NEW):** a summary showing the **6 winners** — the top-ranked entry in each award category — with university, entry name, and winning average. This is defined and buildable now (unlike stall winners).

### 6.3 Deferred: stall winner logic

The **official stall "winner"** (single overall vs per-hall vs per-category) is **deferred** by the client. Build the ranked leaderboard and averages now; **do not** implement a stall "winner" designation or awards output for stalls until the client defines the scope. Leave a clean seam for it.

---

## 7. Setup screens

### 7.1 Stalls
- **View:** filter toolbar (Hall, Category, Sort: Name/Hall/Category) + responsive **grid of stall cards** (image, organization name, `{stallNo} · {hall}`) + a dashed **"＋ Add stall"** card and a header "Add stall" button. Empty state when filters match nothing.
- **Add/Edit form (BUILD — not in prototype):** fields — Organization (required), Stall number(s) (free text, e.g. "A1, A2"; optional), Hall (select from halls), Category (select; optional given the empty-category reality), Image (upload → Cloud Storage, store URL). Edit + delete (soft-delete or hard, confirm). The judge apps read this list.

### 7.2 Criteria — **this is the scale/weight config surface**
- **View:** ordered **list of criterion rows** — drag handle, name, allowed range ("0–10"), weight ("×1") — plus "Add criterion".
- Because scale/weighting is **configurable** (confirmed), this screen must actually edit: **name, order (drag to reorder — wire up real reordering), `max` (range), `weight`**, and which **track** the criterion belongs to (stall criteria vs the two university sets). Add/edit/remove.
- Changing config here changes what judges see and how totals compute — **no redeploy**. The prototype lists the 10 stall criteria statically; production loads them from `stallCriteria` and (for universities) the product/process sets.
- **University criteria** are two sets (product / process) sharing the last six — see judge spec §8.2. Decide whether these are admin-editable or fixed config (recommend editable, same screen, grouped by set).

### 7.3 Halls & categories
- **View:** metric cards, one per hall with its stall count, plus a Categories summary card ("None assigned yet" when empty).
- **BUILD:** manage **halls** (add/rename/remove) and **stall categories** (add/rename/remove). Halls: Lobby, Hall A, Hall B, Between A & B, Hall C, Hall D, Hall E, Outside, University (from the real data). Removing a hall/category in use should warn.

### 7.4 Judges — **correct the prototype to match confirmed decisions**
- Prototype shows columns **Judge · Code · Assigned · Progress** and "codes & PINs issued". **This is now wrong.** Confirmed: **email/password auth** and **every judge scores everything**. Production Judges screen:
  - Columns: **Judge (name) · Email · Progress** (drop "Code", drop "Assigned" or show "All items").
  - **Add judge** = create/invite a Firebase Auth user (email; set/reset password). Edit name, remove judge.
  - **Progress** = items scored / total items (per track, or combined), from `scores`.
- (If the future PIN login lands, a code/PIN column can return — keep the UI flexible.)

### 7.5 University setup — NEW, not prototyped
- **Universities:** manage the list of 11 (add/rename/remove).
- **Award categories:** the 6 (name + **type: product|process** + order). Type controls the criteria set (judge spec §8.2).
- **Entries:** one per (university × award category) — university, award category, **product/process name**, optional image. Add/edit/remove. This is the list the university judge app reads. (Open Q: whether every university is auto-listed per category or only actual entrants — judge spec Open Q.)

---

## 8. Exports (Excel & PDF)

Client proposal requires results downloadable as **Excel (.xlsx)** for analysis and **PDF** for official documentation. Build for both tracks.

**Stall exports**
- **Excel:** at least a **Summary sheet** (rank, organization, stall no, hall, category, average, judges-in) and a **Raw scores sheet** (one row per judge × stall: each criterion's score + that judge's total + notes). This mirrors "data for analysis."
- **PDF:** a formatted official report — event header (name/year/date), the ranked leaderboard table; optionally grouped by hall/category.

**University exports**
- **Excel:** mirror the source workbook's two views — a **category-wise** sheet (per award category, entrants ranked with per-criterion breakdown) and a **university-wise** sheet — plus a **Winners** sheet (the 6). 
- **PDF:** a Winners report + per-category ranked tables.

**Export scope (CONFIRMED):** exports reflect the **on-screen filter** — whatever the current Hall/Category/Sort (or award-category) selection shows is exactly what's exported: same rows, same order. No "full event" toggle; to export everything, the admin clears filters first. **Include pending items** (marked pending) so the file matches the visible table. Applies to both tracks.

**Implementation:** client-side (SheetJS + pdfmake) for MVP, or a Cloud Function for server-generated official PDFs (§3).

---

## 9. Design system (admin-specific additions)

Uses judge spec §9 tokens, plus:
- `--rail:#FBF9F4` (sidebar bg), `--warn:#B5791A`, `--warn-soft:#F6EBD2` (partial-progress pill).
- **Components:** sidebar rail + nav (active = white bg + gold icon); **metric cards** (`.metric`, accent variant = gold); **data table** (uppercase thin headers, row hover, right-aligned numerics); **rank medal** (30px circle; `.medal.g` gold for top 3); **progress pills** (`.pill.full` green / `.pill.part` amber / grey "Pending"); **stall grid cards** + dashed **add card**; **criteria rows** (drag handle, name, max, weight badge); **toolbar** with labeled native `<select>`s (disabled style when unavailable); **toast** (bottom-right on desktop).
- Numbers/headings in **Fraunces**; UI in **Inter** (self-host for consistency, though admin is online).
- Layout: desktop-first; content padding 28–34px; cards radius 14–16px.

---

## 10. Non-functional

- **Responsive:** desktop-first; add a real mobile nav (drawer) below 760px instead of hiding the rail.
- **Real-time** results via Firestore listeners; debounce recomputation.
- **Roles/security:** admin-only gate; Firestore rules enforce it server-side (never rely on UI hiding alone).
- **Performance:** aggregating a few thousand score docs client-side is fine; paginate/virtualize tables only if an event grows large.
- **Accessibility:** labeled selects, keyboard-navigable nav and tables, focus states (already defined).
- **Two tracks, one shell:** abstract track (stalls vs universities) like the judge apps; Results/Criteria/Entries screens are track-aware.

---

## 11. Prototype → production corrections (important)

1. **Judges screen:** replace Code/PIN/Assigned with **Email + Progress**; "Add judge" creates a Firebase Auth user. (Confirmed: email/password, everyone scores everything.)
2. **Averages:** compute from `scores` as **sum ÷ judges-in**, not hardcoded.
3. **Totals denominator** ("/100") must come from criterion config, not be hardcoded (matches judge spec).
4. **Exports:** implement real file generation.
5. **Add buttons:** implement real forms (stalls, criteria, judges, halls, categories, universities, award categories, entries).
6. **Criteria reorder/edit:** make the drag handle and max/weight actually editable.
7. **University track:** build it (Results per category, Winners, Entries, Universities, Award categories, its Criteria sets).
8. **Mobile nav:** add a drawer.

---

## 12. Assumptions

1. Admin is **online-first** (no offline requirement).
2. Results computed **client-side** from `scores` for MVP.
3. Single event at a time (judge spec Open Q — if multi-event, everything scopes under `events/{eventId}` and the admin gets an event switcher).
4. **One admin, who is also a judge** (confirmed) — no multiple-admin or permission-tier model; the admin's scores count in results.
5. Averages shown to **1 decimal**; metric "Avg score" rounded to integer (match prototype) — confirm precision.

---

## 13. Open questions (admin-specific; see also judge spec §14)

RESOLVED: **export scope = on-screen filter** (both tracks, includes pending); **admin model = one admin who is also a judge** (no permission tiers, scores count in results).

1. **Stall winner scope** (deferred) — needed before the stall Winners/awards output can be built.
2. **Event scope:** single vs multiple concurrent events (drives an event switcher).
3. **University entries:** auto-list all universities per category, or only actual entrants? (Same as judge spec.)
4. **Judge progress metric:** per-track or combined count; does an edited/re-opened score affect "scored" status?
5. **Result precision & display** (decimals; show raw total alongside average?).

---

## 14. Suggested build order

1. **Shell + auth:** sidebar/nav, admin-only Firebase Auth gate, design tokens/components ported from prototype.
2. **Setup — stalls:** Halls & categories CRUD; Criteria CRUD (with max/weight/reorder); Stalls CRUD + image upload. Seed real data from the client's spreadsheet.
3. **Judges:** create/invite (email/password), list, progress.
4. **Results — stalls:** read `scores`, compute averages (sum ÷ judges-in), leaderboard with filters/sort/medals/pending, metric cards, realtime.
5. **Setup — universities:** Universities, Award categories (+type), Entries (+image), university Criteria sets.
6. **Results — universities:** per-category leaderboards + **Winners** (6).
7. **Exports:** Excel + PDF for both tracks.
8. **Polish:** mobile drawer nav, empty/loading/error states, precision, permissions if needed.
9. (Deferred) stall winner logic once the client defines scope.

---

## 15. Acceptance criteria

- Admin signs in (email/password), gated to admins only; judges cannot reach admin data (enforced by rules).
- Admin can create/edit halls, categories, criteria (incl. **max & weight & order**), stalls (+image), universities, award categories, entries (+image), and judges (email accounts).
- **Changing a criterion's max/weight or the criteria list changes judge scoring and results totals without a code change.**
- Stall leaderboard ranks by **average = sum ÷ number of judges who scored**, top 3 medalled, pending items shown and sorted last, filter/sort work, updates **live** as scores sync.
- University results show a ranked leaderboard **per award category** and a **Winners** view listing the **6 winners**.
- Excel and PDF exports produce real files for both tracks (summary + raw for Excel; formatted report for PDF), and **reflect the current on-screen filter/sort** (including pending items).
- The **single admin is also a judge**: they appear in the Judges list and their scores are included in averages and "judges in" counts; the admin app is gated to that admin, judges cannot reach admin data (enforced by rules).
- The Judges screen reflects **email accounts** and **no assignment** (every judge scores everything) — not the prototype's code/PIN/assigned.
- No stall "winner" is declared (deferred); the seam for it exists.

---

## 16. Appendix — prototype reference

File: `admin-dashboard.html`. Reference implementations to reuse/port:
- `nav` click handler → panel switching (`data-p` → `.panel.on`).
- `renderResults()` → leaderboard: filtering, ranking, pending handling, medals, Judges-in pills, empty state.
- `renderStalls()` → stall grid with filters/sort + add card + empty state.
- `fillOptions()` → builds Hall/Category `<select>` options from data; disables Category when none; builds the Halls panel metric cards.
- `updateMetrics()` → Stalls / Scored% / Avg-score cards (currently over dummy data).
- `toast()` → action confirmations.

Dummy data shape (`STALLS`): `{ name, stall, hall, cat, avg, jin }` where `avg` is the item average (null = pending) and `jin` = number of judges who scored it. Production replaces this with derived aggregates over the real `scores` collection.

*End of specification.*
