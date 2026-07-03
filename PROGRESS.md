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
