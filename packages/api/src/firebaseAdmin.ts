import { cert, initializeApp } from 'firebase-admin/app';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';

let cached: Firestore | null = null;

/**
 * The Firestore handle, built on first use rather than at import.
 *
 * `initializeApp` throws outright when the service-account variables are missing, so
 * evaluating this at import time took the whole process down at startup — and with it the
 * per-request fallback to the poems bundled in packages/shared, which exists for precisely
 * that case. authState.ts already deferred it behind a dynamic import and said why; index.ts
 * and poems.ts imported it eagerly, which cancelled the deferral for the process as a whole.
 *
 * Callers already treat Firestore as something that can fail: every read here is inside a
 * try/catch that either falls back or fails open. A throw from this function lands in the
 * same place a rejected query would.
 *
 * Imported from the `firebase-admin/app` and `firebase-admin/firestore` entry points rather
 * than the default export, which stopped carrying `.credential` and `.firestore` in v13.
 */
export function db(): Firestore {
  if (!cached) {
    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    cached = getFirestore(app);
  }
  return cached;
}
