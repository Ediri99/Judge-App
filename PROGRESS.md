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
