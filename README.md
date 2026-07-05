# Judge App

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and fill in Firebase values.
3. Start the dev server with `npm run dev`.
4. Visit the judge shell at `/judge` and the admin shell at `/admin`.

## Testing

- `npm run test` — unit tests (Vitest). Uses `.env.test` (placeholder Firebase config) so Firebase init doesn't fail in a non-browser test environment.
- `npm run test:watch` — unit tests in watch mode.
- `npm run test:e2e` — Playwright e2e/PWA checks. First run `npx playwright install` to download browsers. Builds and serves the app with the same placeholder config (`vite build --mode test`) since no real Firebase project is required for the checks in `e2e/offline-drill.spec.ts`.
