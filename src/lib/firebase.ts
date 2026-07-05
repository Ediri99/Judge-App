import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};

// Without a real VITE_FIREBASE_API_KEY, the Firebase SDK throws synchronously
// on init — and since this module is imported before React ever mounts
// (main.tsx -> App -> AuthProvider -> here), that throw would blank the
// entire app with no error UI at all, not just the Firebase-backed screens.
// Fall back to a placeholder config so init succeeds; real auth/Firestore
// calls will then fail (and be handled) later, in-app, once React is running.
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

if (!isFirebaseConfigured) {
  console.error(
    'Firebase is not configured (missing VITE_FIREBASE_* env vars). ' +
      'Auth and Firestore features will not work until .env.local is set — see .env.example.',
  );
}

const safeConfig = isFirebaseConfigured
  ? firebaseConfig
  : {
      ...firebaseConfig,
      apiKey: 'missing-api-key',
      projectId: 'missing-project',
    };

export const app = initializeApp(safeConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const appConfig = firebaseConfig;

// Secondary app instance used to create judge Auth accounts from the admin
// screen without swapping out the signed-in admin's session.
export function getSecondaryAuth() {
  const existing = getApps().find((instance) => instance.name === 'judge-creation');
  const secondaryApp = existing ?? initializeApp(safeConfig, 'judge-creation');
  return getAuth(secondaryApp);
}
